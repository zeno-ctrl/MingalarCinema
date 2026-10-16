"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookingProgressBar } from "@/components/booking/BookingProgressBar";
import { StripePaymentForm } from "@/components/booking/StripePaymentForm";
import { Button } from "@/components/ui/Button";
import { formatMMK } from "@/lib/utils";
import { readPaymentSession, type PaymentPayload } from "@/lib/payment-session";

function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const [payload, setPayload] = useState<PaymentPayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("PENDING");
  const [simulating, setSimulating] = useState<"success" | "failure" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const checkingRef = useRef(false);
  const simulatingRef = useRef(false);

  useEffect(() => {
    const initial = setTimeout(() => {
      setPayload(bookingId ? readPaymentSession(bookingId) : null);
      setLoaded(true);
    }, 0);
    return () => clearTimeout(initial);
  }, [bookingId]);

  const checkStatus = useCallback(async () => {
    if (!bookingId || checkingRef.current) return;
    checkingRef.current = true;
    try {
      const res = await fetch(`/api/checkout/booking-status?bookingId=${encodeURIComponent(bookingId)}`, { cache: "no-store" });
      if (!res.ok) {
        setConnectionError(res.status === 401 ? "Please sign in again to check your payment in My Tickets." :
          res.status === 404 ? "This booking could not be found. Check your bookings in My Tickets." :
          "We couldn't check payment status. We'll keep trying. You can also check My Tickets.");
        return;
      }
      const data = await res.json();
      setConnectionError(null);
      setStatus(data.status);
      if (data.status === "PAID") router.replace(`/my-tickets/${data.reference}`);
    } catch {
      setConnectionError("Connection interrupted. We'll keep checking your payment. Check My Tickets before paying again.");
    } finally {
      checkingRef.current = false;
    }
  }, [bookingId, router]);

  useEffect(() => {
    if (["PAID", "CANCELLED", "EXPIRED"].includes(status)) return;
    const initial = setTimeout(() => void checkStatus(), 0);
    const id = setInterval(() => void checkStatus(), 2500);
    return () => { clearTimeout(initial); clearInterval(id); };
  }, [checkStatus, status]);

  async function simulate(outcome: "success" | "failure") {
    if (!bookingId || simulatingRef.current) return;
    simulatingRef.current = true;
    setSimulating(outcome);
    setError(null);
    try {
      const res = await fetch("/api/checkout/simulate-payment", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, outcome }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.error === "string" ? data.error : "Couldn't update the demo payment. Please try again.");
        return;
      }
      await checkStatus();
    } catch {
      setError("Couldn't update the demo payment. Check your connection and try again.");
    } finally {
      simulatingRef.current = false;
      setSimulating(null);
    }
  }

  const terminal = status === "CANCELLED" || status === "EXPIRED";
  return (
    <div>
      <BookingProgressBar current={4} />
      <div className="space-y-4 px-4 py-4">
        <h1 className="text-lg font-semibold">Complete payment</h1>
        {!bookingId ? (
          <p className="text-sm text-text-muted">No booking was selected. Open My Tickets to continue a reservation, or choose a movie to book.</p>
        ) : terminal ? (
          <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
            {status === "EXPIRED" ? "This reservation has expired. Please choose your seats again." : "This payment did not go through. Please check My Tickets before booking again."}
          </div>
        ) : !loaded ? (
          <p className="text-sm text-text-muted" role="status">Loading payment details…</p>
        ) : (
          <>
            {payload && <p className="text-lg font-semibold">{formatMMK(payload.total)}</p>}
            {connectionError && <p className="rounded-chip bg-warning/15 px-4 py-3 text-sm text-text-muted" role="status">{connectionError}</p>}
            {error && <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">{error}</div>}
            {payload?.provider === "STRIPE" && payload.clientSecret && <StripePaymentForm clientSecret={payload.clientSecret} onDone={checkStatus} />}
            {payload?.provider === "KBZPAY" && (
              <div className="text-center">
                {payload.qrCodeUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={payload.qrCodeUrl} alt="Scan this QR code with KBZPay to pay for your booking" className="mx-auto h-48 w-48 max-w-full rounded-card" />
                )}
                <p className="mt-3 text-sm text-text-muted">Scan with the KBZPay app to pay. This page will update when your payment is confirmed.</p>
                {payload.deepLink && <a href={payload.deepLink} className="mt-3 inline-block rounded-chip bg-brand-gradient px-6 py-3 text-sm font-semibold text-white">Open in KBZPay</a>}
              </div>
            )}
            {payload?.provider === "MOCK" && (
              <div className="space-y-3">
                <p className="rounded-chip bg-bg-soft p-4 text-sm text-text-muted">This is a demo payment. No money will be charged. Choose an outcome below to try the booking experience.</p>
                <Button className="w-full" loading={simulating === "success"} disabled={simulating === "failure"} onClick={() => simulate("success")}>Simulate successful payment</Button>
                <Button className="w-full" variant="secondary" loading={simulating === "failure"} disabled={simulating === "success"} onClick={() => simulate("failure")}>Simulate failed payment</Button>
              </div>
            )}
            {!payload && <p className="text-sm text-text-muted">Payment details aren&apos;t available in this tab. We&apos;re checking for confirmation. Open My Tickets to see your booking and continue payment if needed.</p>}
          </>
        )}
        <div className="flex flex-wrap gap-4 text-sm font-medium text-brand-red">
          <Link href="/my-tickets" className="inline-flex min-h-11 items-center underline underline-offset-4">Go to My Tickets</Link>
          {(!bookingId || terminal) && <Link href="/movies" className="inline-flex min-h-11 items-center underline underline-offset-4">Browse movies</Link>}
        </div>
      </div>
    </div>
  );
}

export default function ProcessingPage() {
  return <Suspense fallback={<p className="px-4 py-8 text-sm text-text-muted" role="status">Loading payment…</p>}><ProcessingContent /></Suspense>;
}
