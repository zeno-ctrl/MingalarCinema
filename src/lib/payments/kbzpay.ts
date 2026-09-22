import { createHash, timingSafeEqual } from "node:crypto";
import type { CreatePaymentParams, CreatePaymentResult, PaymentProvider, WebhookEvent } from "./types";

/**
 * KBZPay merchant integration (sandbox/UAT). The exact field names and
 * signing algorithm below follow KBZPay's commonly published merchant
 * pattern (sorted-params + merchant-key MD5 signing, matching their SDKs
 * for other markets); confirm the precise request/response schema against
 * the merchant integration guide KBZ Bank provides once real UAT
 * credentials are issued, and adjust `sign`/`buildOrderPayload` to match.
 * Everything else in the booking flow (PaymentProvider interface, webhook
 * idempotency, Booking state machine) is unaffected by that adjustment.
 */
const merchantId = process.env.KBZPAY_MERCHANT_ID || "";
const appId = process.env.KBZPAY_APP_ID || "";
const merchantKey = process.env.KBZPAY_MERCHANT_KEY || "";
const baseUrl = process.env.KBZPAY_BASE_URL || "https://uat.kbzpay.com";

function sign(params: Record<string, string | number>): string {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("md5").update(`${sorted}&key=${merchantKey}`).digest("hex").toUpperCase();
}

export const kbzpayProvider: PaymentProvider = {
  type: "KBZPAY",

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const orderPayload = {
      merch_id: merchantId,
      app_id: appId,
      merch_order_id: params.reference,
      total_amount: params.amount,
      trade_type: "NATIVE",
      notify_url: `${params.returnUrl.replace(/\/checkout.*/, "")}/api/webhooks/kbzpay`,
      body: params.description,
    };
    const signature = sign(orderPayload);

    const res = await fetch(`${baseUrl}/payment/precreate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...orderPayload, sign: signature }),
    });

    if (!res.ok) {
      throw new Error(`KBZPay order creation failed with status ${res.status}`);
    }
    const data = await res.json();
    return {
      providerRef: data.prepay_id || data.merch_order_id || params.reference,
      qrCodeUrl: data.qr_code || data.code_url,
      deepLink: data.deep_link,
    };
  },

  async verifyAndParseWebhook(rawBody: string, _headers: Headers): Promise<WebhookEvent | null> {
    let body: Record<string, string | number>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }

    const { sign: providedSignature, ...rest } = body as { sign?: string } & Record<string, string | number>;
    if (!providedSignature) return null;

    const expected = sign(rest);
    const providedBuf = Buffer.from(String(providedSignature));
    const expectedBuf = Buffer.from(expected);
    if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
      return null;
    }

    const status = String(body.trade_status || body.status).toUpperCase();
    return {
      providerRef: String(body.prepay_id || body.merch_order_id),
      status: status === "SUCCESS" || status === "PAID" ? "SUCCEEDED" : "FAILED",
      amountReceived: Number(body.total_amount) || 0,
      raw: body,
    };
  },
};
