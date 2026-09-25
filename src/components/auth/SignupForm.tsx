"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleIcon, AppleIcon } from "@/components/auth/ProviderIcons";

export function SignupForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message =
          typeof data.error === "string"
            ? data.error
            : Object.values(data.error?.fieldErrors ?? {})
                .flat()
                .join(" ") || t("errors.generic");
        setError(message);
        return;
      }
      setDone(true);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">{t("auth.signupTitle")}</h1>
        <p className="text-text-muted">{t("auth.verifyEmailSent")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("auth.signupTitle")}</h1>

      {error && (
        <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}

      <Input placeholder={t("auth.name")} value={name} onChange={(e) => setName(e.target.value)} required />
      <Input
        type="email"
        placeholder={t("auth.email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <Input
        type="tel"
        placeholder={t("auth.phone")}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="tel"
      />
      <Input
        type="password"
        placeholder={t("auth.password")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        required
        minLength={8}
      />
      <p className="text-xs text-text-muted">
        At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
      </p>

      <Button type="submit" className="w-full" loading={loading}>
        {t("common.signup")}
      </Button>

      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        <span className="text-xs text-text-muted">or</span>
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => signIn("google", { callbackUrl })}
      >
        <GoogleIcon />
        {t("auth.continueWithGoogle")}
      </Button>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => signIn("apple", { callbackUrl })}
      >
        <AppleIcon />
        {t("auth.continueWithApple")}
      </Button>

      <p className="text-center text-sm text-text-muted">
        {t("auth.haveAccount")}{" "}
        <a href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-brand-red hover:underline">
          {t("common.login")}
        </a>
      </p>
    </form>
  );
}
