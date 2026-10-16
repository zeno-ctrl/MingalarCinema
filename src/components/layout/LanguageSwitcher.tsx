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
      type="button"
      onClick={toggle}
      className="min-h-11 min-w-11 rounded-chip px-2 text-xs font-medium hover:bg-black/5 sm:px-3 sm:text-sm dark:hover:bg-white/10"
      aria-label={locale === "en" ? "Switch language to Myanmar" : "Switch language to English"}
      lang={locale === "en" ? "my" : "en"}
    >
      {locale === "en" ? "မြန်မာ" : "English"}
    </button>
  );
}
