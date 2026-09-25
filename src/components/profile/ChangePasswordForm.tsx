"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useI18n } from "@/lib/i18n/provider";

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!hasPassword) {
    return <p className="text-sm text-text-muted">{t("profile.signInWithGoogleNoPassword")}</p>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setLoading(false);
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
    setTimeout(() => signOut({ callbackUrl: "/login" }), 1500);
  }

  if (done) {
    return <p className="text-success">{t("profile.passwordUpdatedSigningOut")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}
      <Input
        type="password"
        placeholder={t("profile.currentPassword")}
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder={t("profile.newPassword")}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        minLength={8}
      />
      <Button type="submit" loading={loading}>
        {t("profile.updatePassword")}
      </Button>
      <p className="text-xs text-text-muted">{t("profile.signOutEverywhereNote")}</p>
    </form>
  );
}
