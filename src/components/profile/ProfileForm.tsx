"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useI18n } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/config";

export function ProfileForm({
  initialName,
  initialPhone,
  initialLanguage,
}: {
  initialName: string;
  initialPhone: string;
  initialLanguage: Locale;
}) {
  const router = useRouter();
  const { setLocale } = useI18n();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [language, setLanguage] = useState<Locale>(initialLanguage);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, language }),
    });
    setLoading(false);
    if (res.ok) {
      setMessage("Saved.");
      setLocale(language);
      router.refresh();
    } else {
      setMessage("Something went wrong.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <div className="flex gap-2">
        {(["en", "mm"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLanguage(l)}
            className={`rounded-chip px-4 py-2 text-sm font-medium ${language === l ? "bg-brand-gradient text-white" : "bg-bg-soft"}`}
          >
            {l === "en" ? "English" : "မြန်မာ"}
          </button>
        ))}
      </div>
      {message && <p className="text-sm text-text-muted">{message}</p>}
      <Button type="submit" loading={loading}>
        Save changes
      </Button>
    </form>
  );
}
