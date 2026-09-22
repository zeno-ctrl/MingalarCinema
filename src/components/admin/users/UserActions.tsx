"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

export function UserActions({
  userId,
  isDisabled,
  role,
  isSuperAdmin,
}: {
  userId: string;
  isDisabled: boolean;
  role: string;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { show } = useToast();

  async function toggleDisabled() {
    const ok = await confirm({
      title: isDisabled ? "Re-enable this account?" : "Disable this account?",
      danger: !isDisabled,
      confirmLabel: isDisabled ? "Enable" : "Disable",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDisabled: !isDisabled }),
    });
    const data = await res.json();
    if (!res.ok) return show(data.error || "Failed", "error");
    show(isDisabled ? "Account enabled" : "Account disabled");
    router.refresh();
  }

  async function changeRole(newRole: string) {
    const ok = await confirm({ title: `Change role to ${newRole}?`, confirmLabel: "Change Role" });
    if (!ok) return;
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    if (!res.ok) return show(data.error || "Failed", "error");
    show("Role updated");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant={isDisabled ? "primary" : "danger"} onClick={toggleDisabled}>
        {isDisabled ? "Enable Account" : "Disable Account"}
      </Button>
      {isSuperAdmin && (
        <select
          className="rounded-chip border border-black/10 bg-bg px-3 py-2 text-sm dark:border-white/15"
          value={role}
          onChange={(e) => changeRole(e.target.value)}
        >
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
      )}
    </div>
  );
}
