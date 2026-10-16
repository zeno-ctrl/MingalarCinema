"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

function ResetPasswordForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const completionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (!done) return;
    completionRef.current?.focus();
    const timer = setTimeout(() => router.push("/login"), 1500);
    return () => clearTimeout(timer);
  }, [done, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
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

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{t("auth.setNewPassword")}</h1>
        <p className="text-text-muted" role="alert">{t("auth.invalidResetLink")}</p>
        <a href="/forgot-password" className="inline-block text-sm text-brand-red hover:underline">{t("auth.forgotPassword")}</a>
      </div>
    );
  }

  if (done) {
    return <p ref={completionRef} tabIndex={-1} className="text-success" role="status">{t("auth.passwordUpdatedRedirecting")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading} aria-describedby={error ? "reset-password-error" : undefined}>
      <h1 className="text-2xl font-semibold">{t("auth.setNewPassword")}</h1>
      {error && (
        <div ref={errorRef} id="reset-password-error" tabIndex={-1} className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="reset-password" className="mb-1 block text-sm text-text-muted">{t("profile.newPassword")}</label>
        <PasswordInput
          id="reset-password"
          name="password"
          placeholder={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          aria-describedby="reset-password-help"
          title={t("auth.passwordRules")}
          pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,72}"
          required
          minLength={8}
          maxLength={72}
          disabled={loading}
        />
        <p id="reset-password-help" className="mt-1 text-xs text-text-muted">{t("auth.passwordRules")}</p>
      </div>
      <Button type="submit" className="w-full" loading={loading}>
        {loading ? t("common.loading") : t("common.save")}
      </Button>
      <p className="text-center text-sm">
        <a href="/forgot-password" className="text-brand-red hover:underline">{t("auth.forgotPassword")}</a>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full rounded-card bg-bg p-6 shadow-card sm:p-8">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
        <p className="mt-4 text-center text-sm">
          <a href="/login" className="text-brand-red hover:underline">{t("common.login")}</a>
        </p>
      </div>
    </div>
  );
}
