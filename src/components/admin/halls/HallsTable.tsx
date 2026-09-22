"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

type HallRow = { id: string; name: string; branchName: string; rows: number; columns: number };

export function HallsTable({ halls }: { halls: HallRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { show } = useToast();

  async function handleDelete(h: HallRow) {
    const ok = await confirm({ title: `Delete "${h.name}"?`, danger: true, confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/admin/halls/${h.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return show(data.error || "Failed to delete", "error");
    show("Hall deleted");
    router.refresh();
  }

  const columns: Column<HallRow>[] = [
    { key: "name", header: "Name", render: (h) => h.name, sortValue: (h) => h.name },
    { key: "branchName", header: "Branch", render: (h) => h.branchName, sortValue: (h) => h.branchName },
    { key: "size", header: "Size", render: (h) => `${h.rows} x ${h.columns}` },
  ];

  return (
    <DataTable
      columns={columns}
      rows={halls}
      searchFn={(h, q) => h.name.toLowerCase().includes(q) || h.branchName.toLowerCase().includes(q)}
      searchPlaceholder="Search halls..."
      actions={(h) => (
        <div className="flex justify-end gap-3 text-sm">
          <Link href={`/admin/halls/${h.id}/layout`} className="text-text-muted hover:underline">
            Seat Layout
          </Link>
          <Link href={`/admin/halls/${h.id}`} className="text-brand-red hover:underline">
            Edit
          </Link>
          <button onClick={() => handleDelete(h)} className="text-error hover:underline">
            Delete
          </button>
        </div>
      )}
    />
  );
}
