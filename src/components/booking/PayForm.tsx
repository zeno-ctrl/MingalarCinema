"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatMMK, cn } from "@/lib/utils";
import { savePaymentSession } from "@/lib/payment-session";

export function PayForm({
  showtimeId,
  subtotal,
  canSellForCash = false,
}: {
  showtimeId: string;
  subtotal: number;
  canSellForCash?: boolean;
}) {
  const router = useRouter();
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<{ discount: number; error?: string } | null>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [method, setMethod] = useState<"CARD" | "KBZPAY" | "PAY_LATER" | "CASH">("CARD");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  async function applyPromo() {
    if (!promoCode.trim() || applyingPromo || busyRef.current) return;
    setApplyingPromo(true);
    setPromoStatus(null);
    try {
      const res = await fetch("/api/checkout/validate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim(), subtotal }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setPromoStatus({ discount: 0, error: typeof data.error === "string" ? data.error : "This promo code could not be applied." });
      } else {
        setPromoStatus({ discount: data.discount });
      }
    } catch {
      setPromoStatus({ discount: 0, error: "Couldn't check the code. Check your connection and try again." });
    } finally {
      setApplyingPromo(false);
    }
  }

  const isCash = method === "CASH";
  const discount = isCash ? 0 : (promoStatus?.discount ?? 0);
  const total = Math.max(0, subtotal - discount);

  async function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current || applyingPromo) return;
    busyRef.current = true;
    setLoading(true);
    setError(null);
    let redirecting = false;
    try {
      const res = await fetch(isCash ? "/api/cashier/create-booking" : "/api/checkout/create-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isCash ? { showtimeId, customerName: customerName.trim(), customerPhone, customerEmail } : {
          showtimeId,
          promoCode: promoStatus && !promoStatus.error ? promoCode.trim() : undefined,
          paymentMethod: method,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error :
          Object.values(data.error?.fieldErrors ?? {}).flat().join(" ") || "Your booking could not be completed. Please try again.");
        return;
      }
      if (isCash) {
        router.push(`/cashier/receipt/${data.reference}`);
      } else if (method === "PAY_LATER") {
        router.push(`/my-tickets/${data.reference}`);
      } else {
        const saved = savePaymentSession(data.bookingId, {
          provider: data.provider, clientSecret: data.clientSecret, qrCodeUrl: data.qrCodeUrl,
          deepLink: data.deepLink, total: data.total, reference: data.reference,
        });
        // The booking already exists: recover from My Tickets if browser storage is blocked.
        router.push(saved ? `/checkout/processing?bookingId=${data.bookingId}` : `/my-tickets/${data.reference}`);
      }
      redirecting = true;
    } catch {
      setError("We couldn't confirm your booking. Check My Tickets before trying again, then check your connection.");
    } finally {
      if (!redirecting) {
        busyRef.current = false;
        setLoading(false);
      }
    }
  }

  const methods: Array<"CARD" | "KBZPAY" | "PAY_LATER" | "CASH"> = canSellForCash
    ? ["CARD", "KBZPAY", "PAY_LATER", "CASH"] : ["CARD", "KBZPAY", "PAY_LATER"];
  const methodLabels: Record<string, string> = {
    CARD: "Credit / Debit Card", KBZPAY: "KBZPay", PAY_LATER: "Reserve & Pay Later", CASH: "Cash (at counter)",
  };

  return (
    <form className="mt-6" onSubmit={handlePay} aria-busy={loading}>
      {!isCash && (
        <>
          <label htmlFor="promo-code" className="mb-2 block text-sm font-semibold text-text-muted">Promo code</label>
          <div className="flex items-start gap-2">
            <Input id="promo-code" placeholder="e.g. WELCOME20" value={promoCode} disabled={applyingPromo || loading}
              autoCapitalize="characters" autoComplete="off" spellCheck={false}
              onChange={(e) => { setPromoCode(e.target.value); setPromoStatus(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void applyPromo(); } }} />
            <Button type="button" variant="secondary" loading={applyingPromo} disabled={!promoCode.trim() || loading} onClick={applyPromo}>Apply</Button>
          </div>
          {promoStatus?.error && <p className="mt-1 text-xs text-error" role="alert">{promoStatus.error}</p>}
          {promoStatus && !promoStatus.error && <p className="mt-1 text-xs text-success" role="status">Promo applied: -{formatMMK(promoStatus.discount)}</p>}
        </>
      )}

      <fieldset className="mt-6" disabled={loading}>
        <legend className="mb-2 text-sm font-semibold text-text-muted">Payment method</legend>
        <div className={cn("grid gap-3", canSellForCash ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 min-[400px]:grid-cols-3")}>
          {methods.map((m) => (
            <label key={m} className={cn("flex cursor-pointer items-center gap-2 rounded-card border-2 p-3 text-sm font-medium transition-colors sm:p-4",
              method === m ? "border-brand-red bg-brand-red text-white" : "border-black/10 dark:border-white/10")}>
              <input type="radio" name="payment-method" value={m} checked={method === m} onChange={() => setMethod(m)} className="h-4 w-4 shrink-0 accent-brand-crimson" />
              <span>{methodLabels[m]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {method === "PAY_LATER" && <p className="mt-2 text-xs text-text-muted">Your seats are held for 2 hours. Pay online with your booking code from My Tickets, or pay cash at any cinema counter — whichever comes first.</p>}

      {isCash && (
        <div className="mt-4 space-y-3">
          <div><label htmlFor="customer-name" className="mb-1 block text-sm">Customer name</label><Input id="customer-name" autoComplete="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required disabled={loading} /></div>
          <div><label htmlFor="customer-phone" className="mb-1 block text-sm">Customer phone (optional)</label><Input id="customer-phone" type="tel" autoComplete="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} disabled={loading} /></div>
          <div><label htmlFor="customer-email" className="mb-1 block text-sm">Customer email (optional, for e-receipt)</label><Input id="customer-email" type="email" autoComplete="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} disabled={loading} /></div>
        </div>
      )}
      <div className="mt-6 flex justify-between gap-3 text-sm"><span className="text-text-muted">Subtotal</span><span>{formatMMK(subtotal)}</span></div>
      {discount > 0 && <div className="mt-1 flex justify-between gap-3 text-sm text-success"><span>Discount</span><span>-{formatMMK(discount)}</span></div>}
      <div className="mt-1 flex justify-between gap-3 text-base font-semibold"><span>Total</span><span>{formatMMK(total)}</span></div>
      {error && <div className="mt-4 rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">{error}</div>}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-bg p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-card-hover dark:border-white/10">
        <div className="mx-auto max-w-2xl"><Button type="submit" className="w-full" loading={loading} disabled={applyingPromo || (isCash && !customerName.trim())}>
          {method === "PAY_LATER" ? `Reserve Seats • ${formatMMK(total)}` : isCash ? `Complete Cash Sale • ${formatMMK(total)}` : `Pay ${formatMMK(total)}`}
        </Button></div>
      </div>
    </form>
  );
}
