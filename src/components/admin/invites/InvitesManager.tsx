"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

type Invite = {
  id: string;
  email: string;
  role: string;
  invitedByName: string;
  expiresAt: string;
  acceptedAt: string | null;
};

export function InvitesManager({ invites }: { invites: Invite[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { show } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "SUPER_ADMIN">("ADMIN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Please check the form.");
      return;
    }
    setEmail("");
    show("Invite sent");
    router.refresh();
  }

  async function handleRevoke(id: string) {
    const ok = await confirm({ title: "Revoke this invite?", danger: true, confirmLabel: "Revoke" });
    if (!ok) return;
    const res = await fetch(`/api/admin/invites/${id}`, { method: "DELETE" });
    if (!res.ok) return show("Failed to revoke", "error");
    show("Invite revoked");
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={handleInvite} className="mb-8 flex max-w-lg items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-text-muted">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Role</label>
          <select
            className="rounded-chip border border-black/10 bg-bg px-3 py-3 text-sm dark:border-white/15"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
        </div>
        <Button type="submit" loading={loading}>
          Send Invite
        </Button>
      </form>
      {error && <p className="mb-4 text-sm text-error">{error}</p>}

      <div className="overflow-x-auto rounded-card border border-black/10 dark:border-white/10">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-bg-soft text-left text-xs uppercase text-text-muted">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Invited By</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {invites.map((i) => (
              <tr key={i.id} className="border-t border-black/5 dark:border-white/10">
                <td className="px-4 py-3">{i.email}</td>
                <td className="px-4 py-3">{i.role}</td>
                <td className="px-4 py-3">{i.invitedByName}</td>
                <td className="px-4 py-3">
                  {i.acceptedAt ? "Accepted" : new Date(i.expiresAt) < new Date() ? "Expired" : "Pending"}
                </td>
                <td className="px-4 py-3 text-right">
                  {!i.acceptedAt && (
                    <button onClick={() => handleRevoke(i.id)} className="text-error hover:underline">
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {invites.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  No invites yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
