/** Payment details stay in this browser tab; bookings remain available in My Tickets. */
export type PaymentPayload = {
  provider: "STRIPE" | "KBZPAY" | "MOCK";
  clientSecret?: string;
  qrCodeUrl?: string;
  deepLink?: string;
  total: number;
  reference: string;
};

export function readPaymentSession(bookingId: string): PaymentPayload | null {
  try {
    const raw = sessionStorage.getItem(`mingalar_payment_${bookingId}`);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const payload = data as Record<string, unknown>;
    if (!["STRIPE", "KBZPAY", "MOCK"].includes(String(payload.provider)) ||
        typeof payload.total !== "number" || !Number.isFinite(payload.total) || payload.total < 0 ||
        typeof payload.reference !== "string" || !payload.reference) return null;
    for (const key of ["clientSecret", "qrCodeUrl", "deepLink"]) {
      if (payload[key] !== undefined && typeof payload[key] !== "string") return null;
    }
    if (payload.provider === "STRIPE" && !payload.clientSecret) return null;
    return payload as PaymentPayload;
  } catch {
    // Storage may be unavailable in private browsing or cleared between steps.
    return null;
  }
}

export function savePaymentSession(bookingId: string, payload: PaymentPayload): boolean {
  try {
    sessionStorage.setItem(`mingalar_payment_${bookingId}`, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
