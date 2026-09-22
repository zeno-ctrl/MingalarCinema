import { prisma } from "@/lib/db";
import type { PaymentProvider } from "@/lib/payments/types";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { getTicketQrDataUrl } from "@/lib/ticket";
import { formatMMK } from "@/lib/utils";

export type WebhookProcessResult = { status: number; body: { ok: boolean; message?: string } };

export async function processPaymentWebhook(provider: PaymentProvider, rawBody: string, headers: Headers): Promise<WebhookProcessResult> {
  const event = await provider.verifyAndParseWebhook(rawBody, headers);
  if (!event) {
    return { status: 400, body: { ok: false, message: "Invalid signature" } };
  }

  const payment = await prisma.payment.findUnique({
    where: { providerRef: event.providerRef },
    include: { booking: true },
  });
  if (!payment) {
    // Unknown reference — acknowledge so the provider doesn't retry forever,
    // but this is unusual enough to be worth a server-side log.
    console.error(`[webhook:${provider.type}] no Payment found for providerRef=${event.providerRef}`);
    return { status: 200, body: { ok: true } };
  }

  // Idempotency: a webhook that's already been fully processed is a no-op,
  // safe to receive any number of times (provider retries, duplicate
  // deliveries).
  if (payment.status === "SUCCEEDED" || payment.status === "REFUNDED") {
    return { status: 200, body: { ok: true } };
  }

  if (event.status === "SUCCEEDED") {
    const alreadyPaid = payment.booking.status === "PAID" || payment.booking.status === "CHECKED_IN";
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCEEDED", rawPayload: event.raw as object },
      });
      if (!alreadyPaid) {
        await tx.booking.update({ where: { id: payment.bookingId }, data: { status: "PAID" } });
        if (payment.booking.promoCodeId) {
          await tx.promoCodeUse.upsert({
            where: { promoCodeId_userId: { promoCodeId: payment.booking.promoCodeId, userId: payment.booking.userId } },
            create: { promoCodeId: payment.booking.promoCodeId, userId: payment.booking.userId },
            update: {},
          });
          await tx.promoCode.update({ where: { id: payment.booking.promoCodeId }, data: { usedCount: { increment: 1 } } });
        }
      }
    });

    if (!alreadyPaid) {
      await sendConfirmationEmail(payment.bookingId).catch((err) =>
        console.error("[webhook] failed to send confirmation email", err),
      );
    }
  } else {
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", rawPayload: event.raw as object } }),
      prisma.booking.updateMany({
        where: { id: payment.bookingId, status: "PENDING" },
        data: { status: "CANCELLED" },
      }),
    ]);
  }

  return { status: 200, body: { ok: true } };
}

async function sendConfirmationEmail(bookingId: string) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { showtime: { include: { movie: true, branch: true, hall: true } }, seats: { include: { seat: true } } },
  });
  const qrDataUrl = await getTicketQrDataUrl(booking);
  await sendBookingConfirmationEmail(booking.contactEmail, {
    reference: booking.reference,
    movieTitle: booking.showtime.movie.titleEn,
    branchName: booking.showtime.branch.nameEn,
    hallName: booking.showtime.hall.name,
    seats: booking.seats.map((s) => s.seat.label),
    startsAt: booking.showtime.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
    total: formatMMK(booking.total),
    qrDataUrl,
  });
}
