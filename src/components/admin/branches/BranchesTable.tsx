"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

type BranchRow = { id: string; nameEn: string; phone: string; isActive: boolean };

export function BranchesTable({ branches }: { branches: BranchRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { show } = useToast();

  async function handleDelete(b: BranchRow) {
    const ok = await confirm({ title: `Delete "${b.nameEn}"?`, danger: true, confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/admin/branches/${b.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return show(data.error || "Failed to delete", "error");
    show("Branch deleted");
    router.refresh();
  }

  const columns: Column<BranchRow>[] = [
    { key: "nameEn", header: "Name", render: (b) => b.nameEn, sortValue: (b) => b.nameEn },
    { key: "phone", header: "Phone", render: (b) => b.phone },
    { key: "isActive", header: "Status", render: (b) => (b.isActive ? "Active" : "Inactive") },
  ];

  return (
    <DataTable
      columns={columns}
      rows={branches}
      searchFn={(b, q) => b.nameEn.toLowerCase().includes(q)}
      searchPlaceholder="Search branches..."
      actions={(b) => (
        <div className="flex justify-end gap-3 text-sm">
          <Link href={`/admin/branches/${b.id}`} className="text-brand-red hover:underline">
            Edit
          </Link>
          <button onClick={() => handleDelete(b)} className="text-error hover:underline">
            Delete
          </button>
        </div>
      )}
    />
  );
}
