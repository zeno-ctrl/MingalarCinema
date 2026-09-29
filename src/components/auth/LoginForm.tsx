"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { GoogleIcon, AppleIcon } from "@/components/auth/ProviderIcons";

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
  INVALID_2FA: {
    en: "That verification code is incorrect.",
    mm: "အတည်ပြုကုဒ် မှားယွင်းနေပါသည်။",
  },
};

export function LoginForm() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [mode, setMode] = useState<"password" | "code">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [otp, setOtp] = useState("");
  const [needsOtp, setNeedsOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: "password" | "code") {
    setMode(next);
    setError(null);
    setNeedsOtp(false);
    setCodeSent(false);
    setPassword("");
    setLoginCode("");
    setOtp("");
  }

  async function handleSendCode() {
    setError(null);
    setSendingCode(true);
    try {
      await fetch("/api/auth/request-login-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setCodeSent(true);
    } catch {
      setError(t("auth.codeRequestFailed"));
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      ...(mode === "password" ? { password } : { loginCode }),
      ...(needsOtp ? { otp } : {}),
      redirect: false,
    });
    setLoading(false);

    if (result?.error === "2FA_REQUIRED") {
      setNeedsOtp(true);
      return;
    }
    if (result?.error) {
      setError(ERROR_MESSAGES[result.error]?.[locale] ?? t("errors.generic"));
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("auth.loginTitle")}</h1>

      {error && (
        <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}

      <Input
        type="email"
        placeholder={t("auth.email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
        disabled={needsOtp || (mode === "code" && codeSent)}
      />

      {mode === "password" && (
        <PasswordInput
          placeholder={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          disabled={needsOtp}
        />
      )}

      {mode === "code" && !codeSent && (
        <Button type="button" className="w-full" loading={sendingCode} onClick={handleSendCode} disabled={!email}>
          {t("auth.sendCode")}
        </Button>
      )}

      {mode === "code" && codeSent && !needsOtp && (
        <div>
          <p className="mb-2 text-sm text-text-muted">{t("auth.codeSent", { email })}</p>
          <Input
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            value={loginCode}
            onChange={(e) => setLoginCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
            required
          />
          <button
            type="button"
            className="mt-2 text-sm text-brand-red hover:underline"
            onClick={handleSendCode}
            disabled={sendingCode}
          >
            {t("auth.resendCode")}
          </button>
        </div>
      )}

      {needsOtp && (
        <div>
          <label className="mb-1 block text-sm text-text-muted" htmlFor="otp">
            {t("auth.otpLabel")}
          </label>
          <Input
            id="otp"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            autoFocus
            required
          />
        </div>
      )}

      {(mode === "password" || (mode === "code" && codeSent)) && (
        <Button type="submit" className="w-full" loading={loading}>
          {needsOtp ? t("common.confirm") : t("common.login")}
        </Button>
      )}

      <div className="flex flex-col items-center gap-2 text-center text-sm">
        <button
          type="button"
          className="text-brand-red hover:underline"
          onClick={() => switchMode(mode === "password" ? "code" : "password")}
          disabled={needsOtp}
        >
          {mode === "password" ? t("auth.useLoginCode") : t("auth.usePassword")}
        </button>
        {mode === "password" && (
          <a href="/forgot-password" className="text-brand-red hover:underline">
            {t("auth.forgotPassword")}
          </a>
        )}
      </div>

      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        <span className="text-xs text-text-muted">or</span>
        <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full items-center gap-2"
        onClick={() => signIn("google", { callbackUrl })}
      >
        {t("auth.continueWithGoogle")}
        <GoogleIcon />
      </Button>

      <Button
        type="button"
        variant="secondary"
        className="w-full items-center gap-2"
        onClick={() => signIn("apple", { callbackUrl })}
      >
        {t("auth.continueWithApple")}
        <AppleIcon />
      </Button>

      <p className="text-center text-sm text-text-muted">
        {t("auth.noAccount")}{" "}
        <a href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-brand-red hover:underline">
          {t("common.signup")}
        </a>
      </p>
    </form>
  );
}
