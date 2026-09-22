"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/admin/Toast";
import type { BrandSettings } from "@/lib/settings";

export function SettingsForm({ initial, canEdit }: { initial: BrandSettings; canEdit: boolean }) {
  const router = useRouter();
  const { show } = useToast();
  const [values, setValues] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Please check the form.");
      return;
    }
    show("Settings saved");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      {!canEdit && (
        <div className="rounded-chip bg-warning/10 px-4 py-3 text-sm text-warning">
          Only super admins can change site-wide settings.
        </div>
      )}
      {error && <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Brand Name</label>
        <Input
          disabled={!canEdit}
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Logo Text</label>
        <Input
          disabled={!canEdit}
          value={values.logoText}
          onChange={(e) => setValues((v) => ({ ...v, logoText: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["orange", "red", "crimson"] as const).map((key) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium capitalize text-text-muted">{key}</label>
            <Input
              disabled={!canEdit}
              type="color"
              value={values.colors[key]}
              onChange={(e) => setValues((v) => ({ ...v, colors: { ...v.colors, [key]: e.target.value } }))}
            />
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Hotline</label>
        <Input
          disabled={!canEdit}
          value={values.hotline}
          onChange={(e) => setValues((v) => ({ ...v, hotline: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["facebook", "viber", "telegram"] as const).map((key) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium capitalize text-text-muted">{key}</label>
            <Input
              disabled={!canEdit}
              value={values.social[key] || ""}
              onChange={(e) => setValues((v) => ({ ...v, social: { ...v.social, [key]: e.target.value } }))}
            />
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Default Language</label>
        <select
          disabled={!canEdit}
          className="w-full rounded-chip border border-black/10 bg-bg px-3 py-3 text-sm dark:border-white/15"
          value={values.defaultLanguage}
          onChange={(e) => setValues((v) => ({ ...v, defaultLanguage: e.target.value as "en" | "mm" }))}
        >
          <option value="en">English</option>
          <option value="mm">Burmese</option>
        </select>
      </div>

      {canEdit && (
        <Button type="submit" loading={loading}>
          Save Settings
        </Button>
      )}
    </form>
  );
}
