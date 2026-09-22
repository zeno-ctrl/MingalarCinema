"use client";

import { useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/Button";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const isRealKey = /^pk_(test|live)_/.test(publishableKey) && !publishableKey.includes("placeholder");

// Deferred to first use (not module load) so a page that merely imports this
// component — e.g. the processing page, which only renders it when the
// mock/KBZPay path isn't taken — never fires an actual request to
// js.stripe.com when Stripe isn't the active provider or isn't configured.
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!isRealKey) return null;
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

function InnerForm({ onDone }: { onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    setLoading(false);
    if (confirmError) {
      setError(confirmError.message || "Payment failed. Please try again.");
      return;
    }
    onDone();
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}
      <Button className="w-full" loading={loading} onClick={handleSubmit}>
        Confirm payment
      </Button>
    </div>
  );
}

export function StripePaymentForm({ clientSecret, onDone }: { clientSecret: string; onDone: () => void }) {
  const stripe = useMemo(() => getStripe(), []);
  if (!stripe) {
    return <p className="text-sm text-error">Stripe is not configured.</p>;
  }
  return (
    <Elements stripe={stripe} options={{ clientSecret }}>
      <InnerForm onDone={onDone} />
    </Elements>
  );
}
