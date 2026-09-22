import { NextResponse } from "next/server";
import { kbzpayProvider } from "@/lib/payments/kbzpay";
import { processPaymentWebhook } from "@/lib/webhook-handler";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const result = await processPaymentWebhook(kbzpayProvider, rawBody, req.headers);
  return NextResponse.json(result.body, { status: result.status });
}
