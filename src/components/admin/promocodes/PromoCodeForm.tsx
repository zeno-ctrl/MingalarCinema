"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/admin/Toast";

export type PromoCodeFormValues = {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  amount: number;
  minSpend: number;
  usageLimit: string;
  expiresAt: string;
  isActive: boolean;
};

const DEFAULTS: PromoCodeFormValues = {
  code: "",
  discountType: "PERCENTAGE",
  amount: 10,
  minSpend: 0,
  usageLimit: "",
  expiresAt: "",
  isActive: true,
};

export function PromoCodeForm({ promoCodeId, initial }: { promoCodeId?: string; initial?: Partial<PromoCodeFormValues> }) {
  const router = useRouter();
  const { show } = useToast();
  const [values, setValues] = useState<PromoCodeFormValues>({ ...DEFAULTS, ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof PromoCodeFormValues>(key: K, value: PromoCodeFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload = {
      ...values,
      usageLimit: values.usageLimit ? Number(values.usageLimit) : null,
      expiresAt: values.expiresAt || null,
    };
    const url = promoCodeId ? `/api/admin/promo-codes/${promoCodeId}` : "/api/admin/promo-codes";
    const res = await fetch(url, {
      method: promoCodeId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Please check the form.");
      return;
    }
    show(promoCodeId ? "Promo code updated" : "Promo code created");
    router.push("/admin/promo-codes");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      {error && <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Code</label>
        <Input value={values.code} onChange={(e) => set("code", e.target.value.toUpperCase())} required />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Discount Type</label>
        <select
          className="w-full rounded-chip border border-black/10 bg-bg px-3 py-3 text-sm dark:border-white/15"
          value={values.discountType}
          onChange={(e) => set("discountType", e.target.value as "PERCENTAGE" | "FIXED")}
        >
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED">Fixed amount (Ks)</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">
          Amount {values.discountType === "PERCENTAGE" ? "(%)" : "(Ks)"}
        </label>
        <Input type="number" value={values.amount} onChange={(e) => set("amount", Number(e.target.value))} required />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Minimum Spend (Ks)</label>
        <Input type="number" value={values.minSpend} onChange={(e) => set("minSpend", Number(e.target.value))} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Usage Limit (blank = unlimited)</label>
        <Input value={values.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Expires At (blank = never)</label>
        <Input type="date" value={values.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.isActive} onChange={(e) => set("isActive", e.target.checked)} />
        Active
      </label>

      <Button type="submit" loading={loading}>
        {promoCodeId ? "Save Changes" : "Create Promo Code"}
      </Button>
    </form>
  );
}
