import Stripe from "stripe";
import type { CreatePaymentParams, CreatePaymentResult, PaymentProvider, WebhookEvent } from "./types";

const secretKey = process.env.STRIPE_SECRET_KEY || "";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const currency = process.env.STRIPE_CURRENCY || "usd";

let stripeClient: Stripe | null = null;
function getClient(): Stripe {
  if (!stripeClient) stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export const stripeProvider: PaymentProvider = {
  type: "STRIPE",

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const stripe = getClient();
    // Stripe doesn't support MMK; the smallest-unit amount below is a direct
    // pass-through of the kyat total for sandbox purposes. A production
    // deployment settling in MMK should use a regional gateway (e.g. 2C2P)
    // behind this same PaymentProvider interface instead.
    const intent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency,
      description: params.description,
      metadata: { bookingId: params.bookingId, reference: params.reference },
    });
    return { providerRef: intent.id, clientSecret: intent.client_secret ?? undefined };
  },

  async verifyAndParseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent | null> {
    const signature = headers.get("stripe-signature");
    if (!signature || !webhookSecret) return null;

    const stripe = getClient();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      return null;
    }

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      return { providerRef: intent.id, status: "SUCCEEDED", amountReceived: intent.amount_received, raw: event };
    }
    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      return { providerRef: intent.id, status: "FAILED", amountReceived: 0, raw: event };
    }
    return null;
  },
};
