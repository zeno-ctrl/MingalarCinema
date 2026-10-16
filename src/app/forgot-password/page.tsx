"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const completionRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (done) completionRef.current?.focus();
  }, [done]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(typeof data?.error === "string" ? data.error : t("errors.generic"));
        return;
      }
      setDone(true);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full rounded-card bg-bg p-6 shadow-card sm:p-8">
        {done ? (
          <div className="space-y-4 text-center">
            <h1 ref={completionRef} tabIndex={-1} className="text-2xl font-semibold">{t("auth.forgotPassword")}</h1>
            <p className="text-text-muted" role="status">{t("auth.resetPasswordSent")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading} aria-describedby={error ? "forgot-password-error" : undefined}>
            <h1 className="text-2xl font-semibold">{t("auth.forgotPassword")}</h1>
            {error && (
              <div ref={errorRef} id="forgot-password-error" tabIndex={-1} className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="forgot-password-email" className="mb-1 block text-sm text-text-muted">{t("auth.email")}</label>
              <Input
                id="forgot-password-email"
                name="email"
                type="email"
                placeholder={t("auth.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              {loading ? t("common.loading") : t("common.continue")}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm">
          <a href="/login" className="text-brand-red hover:underline">{t("common.login")}</a>
        </p>
      </div>
    </div>
  );
}
