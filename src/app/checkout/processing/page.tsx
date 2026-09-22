"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookingProgressBar } from "@/components/booking/BookingProgressBar";
import { StripePaymentForm } from "@/components/booking/StripePaymentForm";
import { Button } from "@/components/ui/Button";
import { formatMMK } from "@/lib/utils";

type PaymentPayload = {
  provider: "STRIPE" | "KBZPAY" | "MOCK";
  clientSecret?: string;
  qrCodeUrl?: string;
  deepLink?: string;
  total: number;
  reference: string;
};

function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [payload] = useState<PaymentPayload | null>(() => {
    if (!bookingId || typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(`cinetown_payment_${bookingId}`);
    return raw ? JSON.parse(raw) : null;
  });
  const [status, setStatus] = useState<string>("PENDING");
  const [simulating, setSimulating] = useState<"success" | "failure" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!bookingId) return;
    const res = await fetch(`/api/checkout/booking-status?bookingId=${bookingId}`);
    if (!res.ok) return;
    const data = await res.json();
    setStatus(data.status);
    if (data.status === "PAID") {
      router.push(`/my-tickets/${data.reference}`);
    } else if (data.status === "CANCELLED" || data.status === "EXPIRED") {
      setError("This payment did not go through. Please start again.");
    }
  }, [bookingId, router]);

  useEffect(() => {
    const id = setInterval(checkStatus, 2500);
    return () => clearInterval(id);
  }, [checkStatus]);

  async function simulate(outcome: "success" | "failure") {
    if (!bookingId) return;
    setSimulating(outcome);
    await fetch("/api/checkout/simulate-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, outcome }),
    });
    setSimulating(null);
    checkStatus();
  }

  if (!bookingId) return null;

  return (
    <div>
      <BookingProgressBar current={4} />
      <div className="px-4 py-4">
        {error ? (
          <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
            {error}
          </div>
        ) : (
          <>
            {payload && <p className="mb-4 text-lg font-semibold">{formatMMK(payload.total)}</p>}

            {payload?.provider === "STRIPE" && payload.clientSecret && (
              <StripePaymentForm clientSecret={payload.clientSecret} onDone={checkStatus} />
            )}

            {payload?.provider === "KBZPAY" && (
              <div className="text-center">
                {payload.qrCodeUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={payload.qrCodeUrl} alt="KBZPay QR code" className="mx-auto h-48 w-48 rounded-card" />
                )}
                <p className="mt-3 text-sm text-text-muted">Scan with the KBZPay app to pay</p>
                {payload.deepLink && (
                  <a href={payload.deepLink} className="mt-3 inline-block rounded-chip bg-brand-gradient px-6 py-3 text-sm font-semibold text-white">
                    Open in KBZPay
                  </a>
                )}
              </div>
            )}

            {payload?.provider === "MOCK" && (
              <div className="space-y-3">
                <p className="rounded-chip bg-bg-soft p-4 text-sm text-text-muted">
                  No live payment gateway is configured yet, so this is a simulated {payload.provider === "MOCK" ? "sandbox" : ""} payment step.
                  Use the buttons below to simulate the outcome — this calls the exact same signed-webhook code path a
                  real Stripe/KBZPay callback would.
                </p>
                <Button className="w-full" loading={simulating === "success"} onClick={() => simulate("success")}>
                  Simulate successful payment
                </Button>
                <Button
                  className="w-full"
                  variant="secondary"
                  loading={simulating === "failure"}
                  onClick={() => simulate("failure")}
                >
                  Simulate failed payment
                </Button>
              </div>
            )}

            {!payload && (
              <p className="text-sm text-text-muted">Waiting for payment confirmation (status: {status})...</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={null}>
      <ProcessingContent />
    </Suspense>
  );
}
