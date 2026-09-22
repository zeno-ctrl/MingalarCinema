"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatMMK, cn } from "@/lib/utils";

export function PayForm({ showtimeId, subtotal }: { showtimeId: string; subtotal: number }) {
  const router = useRouter();
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<{ discount: number; error?: string } | null>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [method, setMethod] = useState<"CARD" | "KBZPAY">("CARD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setApplyingPromo(true);
    setPromoStatus(null);
    const res = await fetch("/api/checkout/validate-promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoCode, subtotal }),
    });
    const data = await res.json();
    setApplyingPromo(false);
    if (!data.valid) {
      setPromoStatus({ discount: 0, error: data.error || "Invalid code" });
    } else {
      setPromoStatus({ discount: data.discount });
    }
  }

  const discount = promoStatus?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  async function handlePay() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/checkout/create-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        showtimeId,
        promoCode: promoStatus && !promoStatus.error ? promoCode : undefined,
        paymentMethod: method,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    sessionStorage.setItem(
      `cinetown_payment_${data.bookingId}`,
      JSON.stringify({
        provider: data.provider,
        clientSecret: data.clientSecret,
        qrCodeUrl: data.qrCodeUrl,
        deepLink: data.deepLink,
        total: data.total,
        reference: data.reference,
      }),
    );
    router.push(`/checkout/processing?bookingId=${data.bookingId}`);
  }

  return (
    <div className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-text-muted">{"Promo code"}</h2>
      <div className="flex gap-2">
        <Input placeholder="e.g. WELCOME20" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
        <Button type="button" variant="secondary" loading={applyingPromo} onClick={applyPromo}>
          Apply
        </Button>
      </div>
      {promoStatus?.error && <p className="mt-1 text-xs text-error">{promoStatus.error}</p>}
      {promoStatus && !promoStatus.error && (
        <p className="mt-1 text-xs text-success">Promo applied: -{formatMMK(promoStatus.discount)}</p>
      )}

      <h2 className="mb-2 mt-6 text-sm font-semibold text-text-muted">Payment method</h2>
      <div className="grid grid-cols-2 gap-3">
        {(["CARD", "KBZPAY"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={cn(
              "rounded-card border-2 p-4 text-left text-sm font-medium",
              method === m ? "border-brand-red bg-brand-red/5" : "border-black/10 dark:border-white/10",
            )}
          >
            {m === "CARD" ? "Credit / Debit Card" : "KBZPay"}
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-between text-sm">
        <span className="text-text-muted">Subtotal</span>
        <span>{formatMMK(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="mt-1 flex justify-between text-sm text-success">
          <span>Discount</span>
          <span>-{formatMMK(discount)}</span>
        </div>
      )}
      <div className="mt-1 flex justify-between text-base font-semibold">
        <span>Total</span>
        <span>{formatMMK(total)}</span>
      </div>

      {error && (
        <div className="mt-4 rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-bg p-4 shadow-card-hover dark:border-white/10">
        <div className="mx-auto max-w-2xl">
          <Button className="w-full" loading={loading} onClick={handlePay}>
            Pay {formatMMK(total)}
          </Button>
        </div>
      </div>
    </div>
  );
}
