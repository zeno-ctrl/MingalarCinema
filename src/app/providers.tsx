"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { I18nProvider } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { ThemeProvider, type ThemePref } from "@/lib/theme/provider";

export function Providers({
  session,
  locale,
  dict,
  themePref,
  children,
}: {
  session: Session | null;
  locale: Locale;
  dict: Dictionary;
  themePref: ThemePref;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider initialPref={themePref}>
        <I18nProvider locale={locale} dict={dict}>
          {children}
        </I18nProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
