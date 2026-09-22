import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth-helpers";
import { mockProvider, signMockWebhookBody } from "@/lib/payments/mock";
import { processPaymentWebhook } from "@/lib/webhook-handler";

const schema = z.object({ bookingId: z.string().min(1), outcome: z.enum(["success", "failure"]) });

/**
 * Dev/demo-only endpoint standing in for a real payment page (Stripe
 * Elements / KBZPay app). It does not mark anything as paid itself — it
 * builds the same signed webhook body a real provider would send and hands
 * it to the exact same processPaymentWebhook() path the real Stripe/KBZPay
 * webhook routes use, so this exercises the real confirmation logic
 * end-to-end rather than a shortcut around it.
 */
export async function POST(req: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
  if (!booking || booking.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payment = await prisma.payment.findFirst({
    where: { bookingId: booking.id, provider: "MOCK" },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) {
    return NextResponse.json({ error: "No mock payment found for this booking" }, { status: 400 });
  }

  const eventBody = JSON.stringify({
    providerRef: payment.providerRef,
    status: parsed.data.outcome === "success" ? "SUCCEEDED" : "FAILED",
    amount: payment.amount,
  });
  const signature = signMockWebhookBody(eventBody);
  const headers = new Headers({ "x-mock-signature": signature });

  const result = await processPaymentWebhook(mockProvider, eventBody, headers);
  return NextResponse.json(result.body, { status: result.status });
}
