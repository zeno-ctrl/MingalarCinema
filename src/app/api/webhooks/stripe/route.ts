import { NextResponse } from "next/server";
import { stripeProvider } from "@/lib/payments/stripe";
import { processPaymentWebhook } from "@/lib/webhook-handler";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const result = await processPaymentWebhook(stripeProvider, rawBody, req.headers);
  return NextResponse.json(result.body, { status: result.status });
}
