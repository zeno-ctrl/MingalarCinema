import type { PaymentProvider, PaymentProviderType } from "./types";
import { stripeProvider } from "./stripe";
import { kbzpayProvider } from "./kbzpay";
import { mockProvider } from "./mock";

const stripeKey = process.env.STRIPE_SECRET_KEY || "";
const stripeConfigured = /^sk_(test|live)_/.test(stripeKey) && !stripeKey.includes("placeholder");
const kbzpayConfigured = !!process.env.KBZPAY_MERCHANT_KEY && process.env.KBZPAY_MERCHANT_ID !== "sandbox-merchant";

/**
 * Selects the real adapter once real sandbox/live credentials are present
 * in the environment, falling back to the local mock otherwise — the only
 * thing that changes between sandbox and live, or between "no keys yet" and
 * "real sandbox keys", is which env vars are set (never application code).
 */
export function getPaymentProvider(method: "CARD" | "KBZPAY"): PaymentProvider {
  if (method === "CARD") return stripeConfigured ? stripeProvider : mockProvider;
  return kbzpayConfigured ? kbzpayProvider : mockProvider;
}

export function getProviderType(method: "CARD" | "KBZPAY"): PaymentProviderType {
  return getPaymentProvider(method).type;
}

export * from "./types";
