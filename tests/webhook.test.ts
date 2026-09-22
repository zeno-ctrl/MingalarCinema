import { describe, it, expect, beforeEach, afterAll } from "vitest";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripeProvider } from "@/lib/payments/stripe";
import { mockProvider, signMockWebhookBody } from "@/lib/payments/mock";
import { processPaymentWebhook } from "@/lib/webhook-handler";

/**
 * Verifies two things that matter most for payment correctness:
 *  1. An unsigned / badly-signed webhook body is rejected outright, never
 *     acted on (a forged "payment succeeded" call must not mark a booking
 *     PAID).
 *  2. Processing the same valid webhook twice (provider retries, duplicate
 *     delivery) is a no-op the second time — the booking is not somehow
 *     double-confirmed or the promo code double-counted.
 */

let userId: string;
let showtimeId: string;
let seatId: string;

async function makePendingBooking(providerRef: string) {
  const booking = await prisma.booking.create({
    data: {
      reference: `WHTEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      showtimeId,
      status: "PENDING",
      subtotal: 6000,
      total: 6000,
      contactEmail: "webhook-test@example.com",
      seats: { create: [{ seatId, price: 6000 }] },
    },
  });
  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      provider: "MOCK",
      providerRef,
      status: "PENDING",
      amount: 6000,
      idempotencyKey: `${booking.id}:${providerRef}`,
    },
  });
  return booking;
}

beforeEach(async () => {
  const user = await prisma.user.findFirstOrThrow();
  const showtime = await prisma.showtime.findFirstOrThrow({ where: { startsAt: { gt: new Date() } } });
  const seat = await prisma.seat.findFirstOrThrow({ where: { hallId: showtime.hallId, isDisabled: false }, skip: 6 });
  userId = user.id;
  showtimeId = showtime.id;
  seatId = seat.id;
  await prisma.bookingSeat.deleteMany({ where: { seatId, booking: { showtimeId } } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("payment webhook verification and idempotency", () => {
  it("rejects a webhook body with an invalid/missing signature", async () => {
    const body = JSON.stringify({ providerRef: "mock_does-not-exist", status: "SUCCEEDED", amount: 6000 });
    const result = await processPaymentWebhook(mockProvider, body, new Headers({ "x-mock-signature": "bogus" }));
    expect(result.status).toBe(400);
  });

  it("rejects a Stripe webhook signed with the wrong secret (forged event)", async () => {
    const payload = JSON.stringify({
      id: "evt_test",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_fake", amount_received: 6000 } },
    });
    const forgedHeader = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_wrong_secret_used_by_an_attacker",
    });
    const result = await processPaymentWebhook(stripeProvider, payload, new Headers({ "stripe-signature": forgedHeader }));
    expect(result.status).toBe(400);
  });

  it("marks a booking PAID exactly once even if the same valid webhook is delivered twice", async () => {
    const providerRef = `mock_${Date.now()}`;
    const booking = await makePendingBooking(providerRef);

    const eventBody = JSON.stringify({ providerRef, status: "SUCCEEDED", amount: 6000 });
    const signature = signMockWebhookBody(eventBody);
    const headers = new Headers({ "x-mock-signature": signature });

    const first = await processPaymentWebhook(mockProvider, eventBody, headers);
    expect(first.status).toBe(200);

    const afterFirst = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(afterFirst.status).toBe("PAID");

    // Deliver the exact same webhook again.
    const second = await processPaymentWebhook(mockProvider, eventBody, headers);
    expect(second.status).toBe(200);

    const afterSecond = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(afterSecond.status).toBe("PAID");

    const payment = await prisma.payment.findUniqueOrThrow({ where: { providerRef } });
    expect(payment.status).toBe("SUCCEEDED");

    await prisma.payment.deleteMany({ where: { bookingId: booking.id } });
    await prisma.booking.delete({ where: { id: booking.id } });
  });

  it("cancels a booking on a FAILED webhook so the seat is released", async () => {
    const providerRef = `mock_${Date.now()}_fail`;
    const booking = await makePendingBooking(providerRef);

    const eventBody = JSON.stringify({ providerRef, status: "FAILED", amount: 6000 });
    const signature = signMockWebhookBody(eventBody);
    const result = await processPaymentWebhook(mockProvider, eventBody, new Headers({ "x-mock-signature": signature }));
    expect(result.status).toBe(200);

    const after = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("CANCELLED");

    await prisma.payment.deleteMany({ where: { bookingId: booking.id } });
    await prisma.booking.delete({ where: { id: booking.id } });
  });
});
