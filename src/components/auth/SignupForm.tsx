"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { GoogleIcon, AppleIcon } from "@/components/auth/ProviderIcons";

function safeCallbackUrl(value: string) {
  try {
    const target = new URL(value, "https://mingalar.local");
    return value.startsWith("/") && target.origin === "https://mingalar.local"
      ? `${target.pathname}${target.search}${target.hash}`
      : "/";
  } catch {
    return "/";
  }
}

export function SignupForm({
  googleEnabled,
  appleEnabled,
}: {
  googleEnabled: boolean;
  appleEnabled: boolean;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl") || "/");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const busy = loading || oauthLoading !== null;
  const automaticLoginError = locale === "mm"
    ? "အကောင့်ဖန်တီးပြီးပါပြီ။ အလိုအလျောက် ဝင်ရောက်၍မရပါ။ ထပ်မံကြိုးစားပါ၊ သို့မဟုတ် ဝင်ရောက်မှုလင့်ခ်ကို အသုံးပြုပါ။"
    : "Your account is created, but we couldn't log you in automatically. Try again or use the Log in link below.";

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setLoading(true);
    let accountReady = accountCreated;
    let redirecting = false;
    try {
      if (!accountReady) {
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
        accountReady = true;
        setAccountCreated(true);
      }
      const result = await signIn("credentials", { email, password, callbackUrl, redirect: false });
      if (!result?.ok || result.error) {
        setError(automaticLoginError);
        return;
      }
      redirecting = true;
      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setError(accountReady ? automaticLoginError : t("errors.generic"));
    } finally {
      if (!redirecting) setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setError(null);
    setOauthLoading(provider);
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setError(t("errors.generic"));
    } finally {
      setOauthLoading(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-busy={busy} aria-describedby={error ? "signup-error" : undefined}>
      <h1 className="text-2xl font-semibold">{t("auth.signupTitle")}</h1>

      {error && (
        <div ref={errorRef} id="signup-error" tabIndex={-1} className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="signup-name" className="mb-1 block text-sm text-text-muted">{t("auth.name")}</label>
        <Input
          id="signup-name"
          name="name"
          placeholder={t("auth.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          maxLength={100}
          required
          disabled={busy || accountCreated}
        />
      </div>
      <div>
        <label htmlFor="signup-email" className="mb-1 block text-sm text-text-muted">{t("auth.email")}</label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          placeholder={t("auth.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={255}
          required
          disabled={busy || accountCreated}
        />
      </div>
      <div>
        <label htmlFor="signup-phone" className="mb-1 block text-sm text-text-muted">{t("auth.phone")}</label>
        <Input
          id="signup-phone"
          name="phone"
          type="tel"
          placeholder={t("auth.phone")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          maxLength={20}
          disabled={busy || accountCreated}
        />
      </div>
      <div>
        <label htmlFor="signup-password" className="mb-1 block text-sm text-text-muted">{t("auth.password")}</label>
        <PasswordInput
          id="signup-password"
          name="password"
          placeholder={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          aria-describedby="signup-password-help"
          title={t("auth.passwordRules")}
          pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,72}"
          required
          minLength={8}
          maxLength={72}
          disabled={busy}
        />
        <p id="signup-password-help" className="mt-1 text-xs text-text-muted">{t("auth.passwordRules")}</p>
      </div>

      <Button type="submit" className="w-full" loading={loading} disabled={busy}>
        {loading ? t("common.loading") : accountCreated ? t("common.login") : t("common.signup")}
      </Button>

      {(googleEnabled || appleEnabled) && <div className="flex items-center gap-3 py-1" aria-hidden="true">
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        <span className="text-xs text-text-muted">or</span>
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>}

      {googleEnabled && <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => handleOAuth("google")}
        loading={oauthLoading === "google"}
        disabled={busy}
      >
        {t("auth.continueWithGoogle")}
        <GoogleIcon />
      </Button>}

      {appleEnabled && <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => handleOAuth("apple")}
        loading={oauthLoading === "apple"}
        disabled={busy}
      >
        {t("auth.continueWithApple")}
        <AppleIcon />
      </Button>}

      <p className="text-center text-sm text-text-muted">
        {t("auth.haveAccount")}{" "}
        <a href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-brand-red hover:underline">
          {t("common.login")}
        </a>
      </p>
    </form>
  );
}
