"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!hasPassword) {
    return <p className="text-sm text-text-muted">You sign in with Google. There&rsquo;s no password to change.</p>;
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
              .join(" ") || "Something went wrong.";
      setError(message);
      return;
    }
    setDone(true);
    setTimeout(() => signOut({ callbackUrl: "/login" }), 1500);
  }

  if (done) {
    return <p className="text-success">Password updated. Signing you out everywhere&hellip;</p>;
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
        placeholder="Current password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="New password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        minLength={8}
      />
      <Button type="submit" loading={loading}>
        Update password
      </Button>
      <p className="text-xs text-text-muted">You&rsquo;ll be signed out everywhere after changing your password.</p>
    </form>
  );
}
