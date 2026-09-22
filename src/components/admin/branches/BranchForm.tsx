"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/admin/Toast";

export type BranchFormValues = {
  nameEn: string;
  nameMm: string;
  addressEn: string;
  addressMm: string;
  phone: string;
  latitude: string;
  longitude: string;
  openingHours: string;
  facilities: string;
  isActive: boolean;
};

const DEFAULTS: BranchFormValues = {
  nameEn: "",
  nameMm: "",
  addressEn: "",
  addressMm: "",
  phone: "",
  latitude: "",
  longitude: "",
  openingHours: "10:00 - 23:00 daily",
  facilities: "",
  isActive: true,
};

export function BranchForm({ branchId, initial }: { branchId?: string; initial?: Partial<BranchFormValues> }) {
  const router = useRouter();
  const { show } = useToast();
  const [values, setValues] = useState<BranchFormValues>({ ...DEFAULTS, ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof BranchFormValues>(key: K, value: BranchFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...values,
      latitude: values.latitude ? Number(values.latitude) : null,
      longitude: values.longitude ? Number(values.longitude) : null,
      facilities: values.facilities.split(",").map((s) => s.trim()).filter(Boolean),
    };

    const url = branchId ? `/api/admin/branches/${branchId}` : "/api/admin/branches";
    const res = await fetch(url, {
      method: branchId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Please check the form for errors.");
      return;
    }
    show(branchId ? "Branch updated" : "Branch created");
    router.push("/admin/branches");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      {error && <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name (English)">
          <Input value={values.nameEn} onChange={(e) => set("nameEn", e.target.value)} required />
        </Field>
        <Field label="Name (Burmese)">
          <Input value={values.nameMm} onChange={(e) => set("nameMm", e.target.value)} required />
        </Field>
        <Field label="Address (English)">
          <Input value={values.addressEn} onChange={(e) => set("addressEn", e.target.value)} required />
        </Field>
        <Field label="Address (Burmese)">
          <Input value={values.addressMm} onChange={(e) => set("addressMm", e.target.value)} required />
        </Field>
        <Field label="Phone">
          <Input value={values.phone} onChange={(e) => set("phone", e.target.value)} required />
        </Field>
        <Field label="Opening Hours">
          <Input value={values.openingHours} onChange={(e) => set("openingHours", e.target.value)} required />
        </Field>
        <Field label="Latitude">
          <Input value={values.latitude} onChange={(e) => set("latitude", e.target.value)} />
        </Field>
        <Field label="Longitude">
          <Input value={values.longitude} onChange={(e) => set("longitude", e.target.value)} />
        </Field>
      </div>

      <Field label="Facilities (comma-separated)">
        <Input value={values.facilities} onChange={(e) => set("facilities", e.target.value)} />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.isActive} onChange={(e) => set("isActive", e.target.checked)} />
        Active
      </label>

      <Button type="submit" loading={loading}>
        {branchId ? "Save Changes" : "Create Branch"}
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
