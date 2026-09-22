"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function Setup2FAPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [token, setToken] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/2fa/setup", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        setSecret(data.secret);
        setQrDataUrl(data.qrDataUrl);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/auth/2fa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, token }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    setRecoveryCodes(data.recoveryCodes);
  }

  if (recoveryCodes) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-card bg-bg p-6 shadow-card">
          <h1 className="mb-2 text-2xl font-semibold">Save your recovery codes</h1>
          <p className="mb-4 text-sm text-text-muted">
            Store these somewhere safe. Each code can be used once if you lose access to your authenticator app.
          </p>
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-chip bg-bg-soft p-4 font-mono text-sm">
            {recoveryCodes.map((code) => (
              <div key={code}>{code}</div>
            ))}
          </div>
          <Button
            className="w-full"
            onClick={async () => {
              // The session JWT cookie only picks up twoFactorEnabled once the
              // session endpoint recomputes it — refresh it before navigating
              // so the /admin gate doesn't bounce us back here.
              await getSession();
              router.push("/admin");
              router.refresh();
            }}
          >
            Continue to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-card bg-bg p-6 shadow-card">
        <h1 className="mb-2 text-2xl font-semibold">Set up two-factor authentication</h1>
        <p className="mb-4 text-sm text-text-muted">
          Two-factor authentication is required for all admin accounts. Scan this QR code with an authenticator app
          (Google Authenticator, Authy, 1Password, etc).
        </p>
        {loading ? (
          <div className="skeleton mx-auto h-48 w-48 rounded-chip" />
        ) : (
          qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="Two-factor authentication QR code" className="mx-auto mb-4 h-48 w-48" />
          )
        )}
        <p className="mb-4 break-all rounded-chip bg-bg-soft p-3 text-center text-xs text-text-muted">{secret}</p>
        {error && (
          <div className="mb-4 rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleEnable} className="space-y-4">
          <Input
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit code"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
            required
          />
          <Button type="submit" className="w-full" loading={submitting}>
            Enable two-factor authentication
          </Button>
        </form>
        <button
          className="mt-4 w-full text-center text-sm text-text-muted hover:underline"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
