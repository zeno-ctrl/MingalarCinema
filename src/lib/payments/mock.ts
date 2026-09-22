import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import type { CreatePaymentParams, CreatePaymentResult, PaymentProvider, WebhookEvent } from "./types";

/**
 * A locally-simulated provider used when no real Stripe/KBZPay sandbox keys
 * are configured, so the full booking flow (including a real, signature-
 * verified webhook round-trip) can be exercised without any external
 * account. It deliberately mirrors the shape of a real provider — a signed
 * webhook payload that only our own server could have produced — rather
 * than a shortcut that skips verification, so the code path it exercises is
 * the same one that will run in production once real keys are set.
 */
const MOCK_SECRET = process.env.NEXTAUTH_SECRET || "mock-payment-secret";

function sign(payload: string): string {
  return createHmac("sha256", MOCK_SECRET).update(payload).digest("hex");
}

export const mockProvider: PaymentProvider = {
  type: "MOCK",

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    return { providerRef: `mock_${randomUUID()}` };
  },

  async verifyAndParseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent | null> {
    const signature = headers.get("x-mock-signature");
    if (!signature) return null;

    const expected = sign(rawBody);
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const body = JSON.parse(rawBody) as { providerRef: string; status: "SUCCEEDED" | "FAILED"; amount: number };
    return { providerRef: body.providerRef, status: body.status, amountReceived: body.amount, raw: body };
  },
};

export function signMockWebhookBody(body: string): string {
  return sign(body);
}
