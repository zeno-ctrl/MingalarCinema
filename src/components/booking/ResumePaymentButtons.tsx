"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function ResumePaymentButtons({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"CARD" | "KBZPAY" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay(method: "CARD" | "KBZPAY") {
    setLoading(method);
    setError(null);
    const res = await fetch("/api/checkout/resume-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, paymentMethod: method }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    sessionStorage.setItem(
      `cinetown_payment_${bookingId}`,
      JSON.stringify({
        provider: data.provider,
        clientSecret: data.clientSecret,
        qrCodeUrl: data.qrCodeUrl,
        deepLink: data.deepLink,
        total: data.total,
        reference: data.reference,
      }),
    );
    router.push(`/checkout/processing?bookingId=${bookingId}`);
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
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
