import { prisma } from "@/lib/db";
import { generateBookingReference, formatMMK } from "@/lib/utils";
import { validatePromoCode } from "@/lib/promo";
import { getPaymentProvider } from "@/lib/payments";
import { MAX_SEATS_PER_BOOKING } from "@/lib/constants";
import { getTicketQrDataUrl } from "@/lib/ticket";
import { sendBookingConfirmationEmail } from "@/lib/email";

// A booking button reserves seats for 2 hours before it's automatically
// released, whether the customer pays right away (card/KBZPay), later online
// with their booking code, or in person at a cashier counter.
export const RESERVATION_WINDOW_MS = 2 * 60 * 60 * 1000;

export type CreateBookingResult =
  | {
      ok: true;
      bookingId: string;
      reference: string;
      total: number;
      expiresAt: string;
      providerRef?: string;
      clientSecret?: string;
      qrCodeUrl?: string;
      deepLink?: string;
      provider?: string;
    }
  | { ok: false; error: string };

export async function createBookingFromHolds({
  userId,
  userEmail,
  userPhone,
  showtimeId,
  promoCode,
  paymentMethod,
  appUrl,
}: {
  userId: string;
  userEmail: string;
  userPhone?: string | null;
  showtimeId: string;
  promoCode?: string;
  // PAY_LATER reserves the seats and hands back a booking code without
  // taking payment yet — the customer completes payment afterward, either
  // online (resumePayment below) or in person with a cashier.
  paymentMethod: "CARD" | "KBZPAY" | "PAY_LATER";
  appUrl: string;
}): Promise<CreateBookingResult> {
  const showtime = await prisma.showtime.findUnique({ where: { id: showtimeId }, include: { movie: true } });
  if (!showtime) return { ok: false, error: "This showtime no longer exists." };
  if (showtime.startsAt < new Date()) return { ok: false, error: "This showtime has already started." };

  const myHolds = await prisma.seatHold.findMany({
    where: { showtimeId, sessionId: userId, expiresAt: { gt: new Date() } },
    include: { seat: true },
  });

  if (myHolds.length === 0) {
    return { ok: false, error: "Your seat selection has expired. Please choose your seats again." };
  }
  if (myHolds.length > MAX_SEATS_PER_BOOKING) {
    return { ok: false, error: `You can book up to ${MAX_SEATS_PER_BOOKING} seats at a time.` };
  }

  const priceByType: Record<string, number> = {
    STANDARD: showtime.priceStandard,
    VIP: showtime.priceVip,
    COUPLE: showtime.priceCouple,
  };
  const subtotal = myHolds.reduce((sum, h) => sum + priceByType[h.seat.type], 0);

  let discount = 0;
  let promoCodeId: string | undefined;
  if (promoCode) {
    const validation = await validatePromoCode(promoCode, subtotal, userId);
    if (!validation.valid) return { ok: false, error: validation.error };
    discount = validation.discount;
    promoCodeId = validation.promoCodeId;
  }
  const total = Math.max(0, subtotal - discount);
  const reference = generateBookingReference();

  // Convert the holds into a real, payment-pending reservation. Re-checking
  // expiresAt inside the same transaction (not just above) closes the
  // narrow window between the read above and this write.
  let booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      const stillHeld = await tx.seatHold.findMany({
        where: { showtimeId, sessionId: userId, expiresAt: { gt: new Date() } },
      });
      const stillHeldIds = new Set(stillHeld.map((h) => h.seatId));
      const seatsToBook = myHolds.filter((h) => stillHeldIds.has(h.seatId));
      if (seatsToBook.length === 0) {
        throw new Error("HOLD_EXPIRED");
      }

      const created = await tx.booking.create({
        data: {
          reference,
          userId,
          showtimeId,
          status: "PENDING",
          subtotal,
          discount,
          total,
          promoCodeId,
          contactEmail: userEmail,
          contactPhone: userPhone || null,
          expiresAt: new Date(Date.now() + RESERVATION_WINDOW_MS),
          seats: {
            create: seatsToBook.map((h) => ({ seatId: h.seatId, price: priceByType[h.seat.type] })),
          },
        },
      });

      await tx.seatHold.deleteMany({ where: { showtimeId, sessionId: userId } });

      return created;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "HOLD_EXPIRED") {
      return { ok: false, error: "Your seat selection has expired. Please choose your seats again." };
    }
    throw err;
  }

  if (paymentMethod === "PAY_LATER") {
    return {
      ok: true,
      bookingId: booking.id,
      reference: booking.reference,
      total: booking.total,
      expiresAt: booking.expiresAt!.toISOString(),
    };
  }

  const paymentResult = await startPayment(booking, showtime.movie.title, paymentMethod, appUrl);

  return {
    ok: true,
    bookingId: booking.id,
    reference: booking.reference,
    total: booking.total,
    expiresAt: booking.expiresAt!.toISOString(),
    providerRef: paymentResult.providerRef,
    clientSecret: paymentResult.clientSecret,
    qrCodeUrl: paymentResult.qrCodeUrl,
    deepLink: paymentResult.deepLink,
    provider: paymentResult.provider,
  };
}

async function startPayment(
  booking: { id: string; reference: string; total: number },
  movieTitle: string,
  paymentMethod: "CARD" | "KBZPAY",
  appUrl: string,
) {
  const provider = getPaymentProvider(paymentMethod);
  const paymentResult = await provider.createPayment({
    bookingId: booking.id,
    reference: booking.reference,
    amount: booking.total,
    description: `${movieTitle} - ${booking.reference}`,
    returnUrl: `${appUrl}/checkout/processing?bookingId=${booking.id}`,
  });

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      provider: provider.type,
      providerRef: paymentResult.providerRef,
      status: "PENDING",
      amount: booking.total,
      idempotencyKey: `${booking.id}:${paymentResult.providerRef}`,
    },
  });

  return { ...paymentResult, provider: provider.type };
}

export type ResumePaymentResult =
  | {
      ok: true;
      providerRef: string;
      clientSecret?: string;
      qrCodeUrl?: string;
      deepLink?: string;
      provider: string;
      total: number;
      reference: string;
    }
  | { ok: false; error: string };

/** Lets a customer come back later and pay online for a PAY_LATER reservation, using its booking code. */
export async function resumePayment({
  bookingId,
  userId,
  paymentMethod,
  appUrl,
}: {
  bookingId: string;
  userId: string;
  paymentMethod: "CARD" | "KBZPAY";
  appUrl: string;
}): Promise<ResumePaymentResult> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { showtime: { include: { movie: true } } } });
  if (!booking || booking.userId !== userId) return { ok: false, error: "Booking not found." };
  if (booking.status !== "PENDING" || (booking.expiresAt && booking.expiresAt < new Date())) {
    return { ok: false, error: "This reservation has expired or is no longer pending payment." };
  }

  const paymentResult = await startPayment(booking, booking.showtime.movie.title, paymentMethod, appUrl);

  return {
    ok: true,
    providerRef: paymentResult.providerRef,
    clientSecret: paymentResult.clientSecret,
    qrCodeUrl: paymentResult.qrCodeUrl,
    deepLink: paymentResult.deepLink,
    provider: paymentResult.provider,
    total: booking.total,
    reference: booking.reference,
  };
}

export type ConfirmCashPaymentResult =
  | { ok: true; reference: string; total: number }
  | { ok: false; error: string };

/**
 * Cashier counter flow for a "pay at cinema" reservation: the customer
 * already has a PENDING booking (and its code) from the online "Book Now,
 * Pay Later" option; the cashier looks it up by reference and collects cash.
 * Mirrors the PAID transition in webhook-handler.ts (promo usage included)
 * but with a CASH payment record instead of a provider webhook.
 */
export async function confirmCashPaymentForBooking(reference: string): Promise<ConfirmCashPaymentResult> {
  const booking = await prisma.booking.findUnique({
    where: { reference },
    include: { showtime: { include: { movie: true, branch: true, hall: true } }, seats: { include: { seat: true } } },
  });
  if (!booking) return { ok: false, error: "No booking found with that code." };
  if (booking.status !== "PENDING") {
    return { ok: false, error: `This booking is already ${booking.status.toLowerCase()}.` };
  }
  if (booking.expiresAt && booking.expiresAt < new Date()) {
    return { ok: false, error: "This reservation has expired." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        bookingId: booking.id,
        provider: "CASH",
        providerRef: `cash_${booking.id}`,
        status: "SUCCEEDED",
        amount: booking.total,
        idempotencyKey: `cash:${booking.id}`,
      },
    });
    await tx.booking.update({ where: { id: booking.id }, data: { status: "PAID" } });
    if (booking.promoCodeId) {
      await tx.promoCodeUse.upsert({
        where: { promoCodeId_userId: { promoCodeId: booking.promoCodeId, userId: booking.userId } },
        create: { promoCodeId: booking.promoCodeId, userId: booking.userId },
        update: {},
      });
      await tx.promoCode.update({ where: { id: booking.promoCodeId }, data: { usedCount: { increment: 1 } } });
    }
  });

  if (booking.contactEmail && !booking.contactEmail.endsWith("@no-reply.local")) {
    const qrDataUrl = await getTicketQrDataUrl(booking);
    await sendBookingConfirmationEmail(booking.contactEmail, {
      reference: booking.reference,
      movieTitle: booking.showtime.movie.title,
      branchName: booking.showtime.branch.nameEn,
      hallName: booking.showtime.hall.name,
      seats: booking.seats.map((s) => s.seat.label),
      startsAt: booking.showtime.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
      total: formatMMK(booking.total),
      qrDataUrl,
    }).catch((err) => console.error("[cashier] failed to send confirmation email", err));
  }

  return { ok: true, reference: booking.reference, total: booking.total };
}

export type CreateCashBookingResult =
  | { ok: true; bookingId: string; reference: string; total: number }
  | { ok: false; error: string };

/**
 * Ticket-counter sale: a cashier collects cash in person, so there's no
 * payment gateway round-trip — the booking is created already PAID instead
 * of going through the PENDING -> webhook confirmation flow that online
 * card/KBZPay checkouts use. Seat holds are still required first (via the
 * same /api/checkout/hold endpoint customers use), held under the cashier's
 * own session id.
 */
export async function createCashBooking({
  cashierId,
  showtimeId,
  customerName,
  customerPhone,
  customerEmail,
}: {
  cashierId: string;
  showtimeId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
}): Promise<CreateCashBookingResult> {
  const showtime = await prisma.showtime.findUnique({ where: { id: showtimeId }, include: { movie: true } });
  if (!showtime) return { ok: false, error: "This showtime no longer exists." };
  if (showtime.startsAt < new Date()) return { ok: false, error: "This showtime has already started." };

  const myHolds = await prisma.seatHold.findMany({
    where: { showtimeId, sessionId: cashierId, expiresAt: { gt: new Date() } },
    include: { seat: true },
  });
  if (myHolds.length === 0) {
    return { ok: false, error: "No seats selected, or the seat hold expired. Please select seats again." };
  }
  if (myHolds.length > MAX_SEATS_PER_BOOKING) {
    return { ok: false, error: `You can book up to ${MAX_SEATS_PER_BOOKING} seats at a time.` };
  }

  const priceByType: Record<string, number> = {
    STANDARD: showtime.priceStandard,
    VIP: showtime.priceVip,
    COUPLE: showtime.priceCouple,
  };
  const subtotal = myHolds.reduce((sum, h) => sum + priceByType[h.seat.type], 0);
  const reference = generateBookingReference();
  // Booking.contactEmail is required; walk-in sales without a real email get
  // a non-deliverable placeholder and simply skip the confirmation email.
  const contactEmail = customerEmail?.trim() || `walkin+${reference.toLowerCase()}@no-reply.local`;

  let booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      const stillHeld = await tx.seatHold.findMany({
        where: { showtimeId, sessionId: cashierId, expiresAt: { gt: new Date() } },
      });
      const stillHeldIds = new Set(stillHeld.map((h) => h.seatId));
      const seatsToBook = myHolds.filter((h) => stillHeldIds.has(h.seatId));
      if (seatsToBook.length === 0) {
        throw new Error("HOLD_EXPIRED");
      }

      const created = await tx.booking.create({
        data: {
          reference,
          userId: cashierId,
          showtimeId,
          status: "PAID",
          subtotal,
          discount: 0,
          total: subtotal,
          contactEmail,
          contactPhone: customerPhone?.trim() || null,
          guestName: customerName.trim(),
          seats: {
            create: seatsToBook.map((h) => ({ seatId: h.seatId, price: priceByType[h.seat.type] })),
          },
        },
      });

      await tx.seatHold.deleteMany({ where: { showtimeId, sessionId: cashierId } });

      await tx.payment.create({
        data: {
          bookingId: created.id,
          provider: "CASH",
          providerRef: `cash_${created.id}`,
          status: "SUCCEEDED",
          amount: created.total,
          idempotencyKey: `cash:${created.id}`,
        },
      });

      return created;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "HOLD_EXPIRED") {
      return { ok: false, error: "Your seat selection expired. Please select seats again." };
    }
    throw err;
  }

  if (customerEmail?.trim()) {
    const full = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: { showtime: { include: { movie: true, branch: true, hall: true } }, seats: { include: { seat: true } } },
    });
    const qrDataUrl = await getTicketQrDataUrl(full);
    await sendBookingConfirmationEmail(contactEmail, {
      reference: full.reference,
      movieTitle: full.showtime.movie.title,
      branchName: full.showtime.branch.nameEn,
      hallName: full.showtime.hall.name,
      seats: full.seats.map((s) => s.seat.label),
      startsAt: full.showtime.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
      total: formatMMK(full.total),
      qrDataUrl,
    }).catch((err) => console.error("[cashier] failed to send confirmation email", err));
  }

  return { ok: true, bookingId: booking.id, reference: booking.reference, total: booking.total };
}

export async function expireStaleBookings() {
  await prisma.booking.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
}
