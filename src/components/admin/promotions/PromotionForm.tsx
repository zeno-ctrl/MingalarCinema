"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { useToast } from "@/components/admin/Toast";

export type PromotionFormValues = {
  titleEn: string;
  titleMm: string;
  bodyEn: string;
  bodyMm: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  published: boolean;
};

const DEFAULTS: PromotionFormValues = {
  titleEn: "",
  titleMm: "",
  bodyEn: "",
  bodyMm: "",
  imageUrl: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  published: false,
};

export function PromotionForm({ promotionId, initial }: { promotionId?: string; initial?: Partial<PromotionFormValues> }) {
  const router = useRouter();
  const { show } = useToast();
  const [values, setValues] = useState<PromotionFormValues>({ ...DEFAULTS, ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof PromotionFormValues>(key: K, value: PromotionFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const url = promotionId ? `/api/admin/promotions/${promotionId}` : "/api/admin/promotions";
    const res = await fetch(url, {
      method: promotionId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Please check the form.");
      return;
    }
    show(promotionId ? "Promotion updated" : "Promotion created");
    router.push("/admin/promotions");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      {error && <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title (English)">
          <Input value={values.titleEn} onChange={(e) => set("titleEn", e.target.value)} required />
        </Field>
        <Field label="Title (Burmese)">
          <Input value={values.titleMm} onChange={(e) => set("titleMm", e.target.value)} required />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Body (English)">
          <textarea
            className="w-full rounded-chip border border-black/10 bg-bg p-3 text-sm dark:border-white/15"
            rows={4}
            value={values.bodyEn}
            onChange={(e) => set("bodyEn", e.target.value)}
            required
          />
        </Field>
        <Field label="Body (Burmese)">
          <textarea
            className="w-full rounded-chip border border-black/10 bg-bg p-3 text-sm dark:border-white/15"
            rows={4}
            value={values.bodyMm}
            onChange={(e) => set("bodyMm", e.target.value)}
            required
          />
        </Field>
      </div>

      <ImageUploadField label="Image" value={values.imageUrl} onChange={(v) => set("imageUrl", v)} />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start Date">
          <Input type="date" value={values.startDate} onChange={(e) => set("startDate", e.target.value)} required />
        </Field>
        <Field label="End Date">
          <Input type="date" value={values.endDate} onChange={(e) => set("endDate", e.target.value)} required />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.published} onChange={(e) => set("published", e.target.checked)} />
        Published
      </label>

      <Button type="submit" loading={loading}>
        {promotionId ? "Save Changes" : "Create Promotion"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-text-muted">{label}</label>
      {children}
    </div>
  );
}
