export type PaymentProviderType = "STRIPE" | "KBZPAY" | "MOCK";

export type CreatePaymentParams = {
  bookingId: string;
  reference: string;
  amount: number; // MMK, whole kyat (no decimals)
  description: string;
  returnUrl: string;
};

export type CreatePaymentResult = {
  providerRef: string;
  /** Stripe: client_secret for Payment Element. */
  clientSecret?: string;
  /** KBZPay: QR image URL to display. */
  qrCodeUrl?: string;
  /** KBZPay: app deep link for mobile "Open in KBZPay" button. */
  deepLink?: string;
  /** Mock: no external redirect needed, page shows simulate buttons. */
};

export type WebhookEvent = {
  providerRef: string;
  status: "SUCCEEDED" | "FAILED";
  amountReceived: number;
  raw: unknown;
};

export interface PaymentProvider {
  readonly type: PaymentProviderType;
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  /**
   * Verifies the webhook's signature and, only if valid, returns the
   * normalized event. Returns null for an invalid/unverifiable signature so
   * callers never act on unauthenticated webhook bodies.
   */
  verifyAndParseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent | null>;
}
