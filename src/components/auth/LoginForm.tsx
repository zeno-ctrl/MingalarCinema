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

const ERROR_MESSAGES: Record<string, { en: string; mm: string }> = {
  INVALID_CREDENTIALS: {
    en: "Incorrect email or password.",
    mm: "အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်။",
  },
  ACCOUNT_LOCKED: {
    en: "Too many failed attempts. Please try again in 15 minutes.",
    mm: "မှားယွင်းမှုများလွန်းပါသည်။ ၁၅ မိနစ်အကြာတွင် ထပ်စမ်းကြည့်ပါ။",
  },
  ACCOUNT_DISABLED: {
    en: "This account has been disabled. Contact support for help.",
    mm: "ဤအကောင့်ကို ပိတ်ထားပါသည်။ အကူအညီအတွက် ဆက်သွယ်ပါ။",
  },
};

export function LoginForm({
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
  const queryError = searchParams.get("error");

  const [mode, setMode] = useState<"password" | "code">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    queryError ? ERROR_MESSAGES[queryError]?.[locale] ?? t("errors.generic") : null,
  );
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const busy = loading || sendingCode || oauthLoading !== null;

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  function switchMode(next: "password" | "code") {
    setMode(next);
    setError(null);
    setCodeSent(false);
    setPassword("");
    setLoginCode("");
  }

  async function handleSendCode() {
    setError(null);
    setSendingCode(true);
    try {
      const response = await fetch("/api/auth/request-login-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("Code request failed");
      setCodeSent(true);
    } catch {
      setError(t("auth.codeRequestFailed"));
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (mode === "code" && !codeSent) {
      await handleSendCode();
      return;
    }
    setError(null);
    setLoading(true);
    let redirecting = false;
    try {
      const result = await signIn("credentials", {
        email,
        ...(mode === "password" ? { password } : { loginCode }),
        callbackUrl,
        redirect: false,
      });
      if (!result?.ok || result.error) {
        setError(ERROR_MESSAGES[result?.error ?? ""]?.[locale] ?? t("errors.generic"));
        return;
      }
      redirecting = true;
      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setError(t("errors.generic"));
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
    <form onSubmit={handleSubmit} className="space-y-4" aria-busy={busy} aria-describedby={error ? "login-error" : undefined}>
      <h1 className="text-2xl font-semibold">{t("auth.loginTitle")}</h1>

      {error && (
        <div ref={errorRef} id="login-error" tabIndex={-1} className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="login-email" className="mb-1 block text-sm text-text-muted">{t("auth.email")}</label>
        <Input
          id="login-email"
          name="email"
          type="email"
          placeholder={t("auth.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          readOnly={mode === "code" && codeSent}
          disabled={busy}
        />
      </div>

      {mode === "password" && (
        <div>
          <label htmlFor="login-password" className="mb-1 block text-sm text-text-muted">{t("auth.password")}</label>
          <PasswordInput
            id="login-password"
            name="password"
            placeholder={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={busy}
          />
        </div>
      )}

      {mode === "code" && !codeSent && (
        <Button type="submit" className="w-full" loading={sendingCode} disabled={busy || !email}>
          {sendingCode ? t("auth.sendingCode") : t("auth.sendCode")}
        </Button>
      )}

      {mode === "code" && codeSent && (
        <div>
          <p id="login-code-help" className="mb-2 text-sm text-text-muted" role="status">{t("auth.codeSent", { email })}</p>
          <label htmlFor="login-code" className="mb-1 block text-sm text-text-muted">{t("auth.loginCodeLabel")}</label>
          <Input
            id="login-code"
            name="loginCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-describedby="login-code-help"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            value={loginCode}
            onChange={(e) => setLoginCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
            required
            disabled={busy}
          />
          <button
            type="button"
            className="mt-2 text-sm text-brand-red hover:underline"
            onClick={handleSendCode}
            disabled={busy}
            aria-busy={sendingCode}
          >
            {sendingCode ? t("auth.sendingCode") : t("auth.resendCode")}
          </button>
        </div>
      )}

      {(mode === "password" || (mode === "code" && codeSent)) && (
        <Button type="submit" className="w-full" loading={loading} disabled={busy}>
          {loading ? t("common.loading") : t("common.login")}
        </Button>
      )}

      <div className="flex flex-col items-center gap-2 text-center text-sm">
        <button
          type="button"
          className="text-brand-red hover:underline"
          onClick={() => switchMode(mode === "password" ? "code" : "password")}
          disabled={busy}
        >
          {mode === "password" ? t("auth.useLoginCode") : t("auth.usePassword")}
        </button>
        {mode === "password" && (
          <a href="/forgot-password" className="text-brand-red hover:underline">
            {t("auth.forgotPassword")}
          </a>
        )}
      </div>

      {(googleEnabled || appleEnabled) && <div className="flex items-center gap-3 py-1" aria-hidden="true">
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        <span className="text-xs text-text-muted">or</span>
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>}

      {googleEnabled && <Button
        type="button"
        variant="secondary"
        className="w-full items-center gap-2"
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
        className="w-full items-center gap-2"
        onClick={() => handleOAuth("apple")}
        loading={oauthLoading === "apple"}
        disabled={busy}
      >
        {t("auth.continueWithApple")}
        <AppleIcon />
      </Button>}

      <p className="text-center text-sm text-text-muted">
        {t("auth.noAccount")}{" "}
        <a href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-brand-red hover:underline">
          {t("common.signup")}
        </a>
      </p>
    </form>
  );
}
