import { NextResponse } from "next/server";
import { mockProvider } from "@/lib/payments/mock";
import { processPaymentWebhook } from "@/lib/webhook-handler";

/**
 * Only ever receives requests carrying a valid HMAC signature over the raw
 * body (see src/lib/payments/mock.ts) — the "Simulate payment" button in the
 * UI calls a same-origin API route that signs the event server-side, so an
 * unauthenticated client can never fabricate a payment confirmation here.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const result = await processPaymentWebhook(mockProvider, rawBody, req.headers);
  return NextResponse.json(result.body, { status: result.status });
}
