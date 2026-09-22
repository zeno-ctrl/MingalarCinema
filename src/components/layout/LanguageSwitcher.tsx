"use client";

import { useI18n } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/config";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  function toggle() {
    const next: Locale = locale === "en" ? "mm" : "en";
    setLocale(next);
  }

  return (
    <button
      onClick={toggle}
      className="rounded-chip px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
      aria-label="Switch language"
    >
      {locale === "en" ? "မြန်မာ" : "English"}
    </button>
  );
}
