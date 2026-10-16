"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { savePaymentSession } from "@/lib/payment-session";

export function ResumePaymentButtons({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"CARD" | "KBZPAY" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  async function pay(method: "CARD" | "KBZPAY") {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(method);
    setError(null);
    let redirecting = false;
    try {
      const res = await fetch("/api/checkout/resume-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, paymentMethod: method }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Couldn't start payment. Please try again.");
        return;
      }
      const saved = savePaymentSession(bookingId, {
          provider: data.provider,
          clientSecret: data.clientSecret,
          qrCodeUrl: data.qrCodeUrl,
          deepLink: data.deepLink,
          total: data.total,
          reference: data.reference,
        });
      if (!saved) {
        setError("Your browser couldn't save the payment details. Allow site storage, then try again. Your reservation is still in My Tickets.");
        return;
      }
      router.push(`/checkout/processing?bookingId=${bookingId}`);
      redirecting = true;
    } catch {
      setError("Couldn't start payment. Check your connection and try again.");
    } finally {
      if (!redirecting) {
        busyRef.current = false;
        setLoading(null);
      }
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <Button loading={loading === "CARD"} disabled={loading === "KBZPAY"} onClick={() => pay("CARD")}>
          Pay by Card
        </Button>
        <Button
          variant="secondary"
          loading={loading === "KBZPAY"}
          disabled={loading === "CARD"}
          onClick={() => pay("KBZPAY")}
        >
          Pay by KBZPay
        </Button>
      </div>
      <p className="text-center text-xs text-text-muted">Or show this booking code at any cinema counter to pay cash.</p>
    </div>
  );
}
