import { prisma } from "@/lib/db";
import { generateBookingReference } from "@/lib/utils";
import { validatePromoCode } from "@/lib/promo";
import { getPaymentProvider } from "@/lib/payments";
import { MAX_SEATS_PER_BOOKING } from "@/lib/constants";

const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

export type CreateBookingResult =
  | {
      ok: true;
      bookingId: string;
      reference: string;
      total: number;
      providerRef: string;
      clientSecret?: string;
      qrCodeUrl?: string;
      deepLink?: string;
      provider: string;
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
  paymentMethod: "CARD" | "KBZPAY";
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
          expiresAt: new Date(Date.now() + PAYMENT_WINDOW_MS),
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

  const provider = getPaymentProvider(paymentMethod);
  const paymentResult = await provider.createPayment({
    bookingId: booking.id,
    reference: booking.reference,
    amount: booking.total,
    description: `${showtime.movie.titleEn} - ${booking.reference}`,
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

  return {
    ok: true,
    bookingId: booking.id,
    reference: booking.reference,
    total: booking.total,
    providerRef: paymentResult.providerRef,
    clientSecret: paymentResult.clientSecret,
    qrCodeUrl: paymentResult.qrCodeUrl,
    deepLink: paymentResult.deepLink,
    provider: provider.type,
  };
}

export async function expireStaleBookings() {
  await prisma.booking.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
}
