"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

type PromotionRow = { id: string; titleEn: string; startDate: string; endDate: string; published: boolean };

export function PromotionsTable({ promotions }: { promotions: PromotionRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { show } = useToast();

  async function handleDelete(p: PromotionRow) {
    const ok = await confirm({ title: `Delete "${p.titleEn}"?`, danger: true, confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/admin/promotions/${p.id}`, { method: "DELETE" });
    if (!res.ok) return show("Failed to delete", "error");
    show("Promotion deleted");
    router.refresh();
  }

  const columns: Column<PromotionRow>[] = [
    { key: "titleEn", header: "Title", render: (p) => p.titleEn, sortValue: (p) => p.titleEn },
    { key: "startDate", header: "Start", render: (p) => new Date(p.startDate).toLocaleDateString() },
    { key: "endDate", header: "End", render: (p) => new Date(p.endDate).toLocaleDateString() },
    { key: "published", header: "Published", render: (p) => (p.published ? "Yes" : "No") },
  ];

  return (
    <DataTable
      columns={columns}
      rows={promotions}
      searchFn={(p, q) => p.titleEn.toLowerCase().includes(q)}
      searchPlaceholder="Search promotions..."
      actions={(p) => (
        <div className="flex justify-end gap-3 text-sm">
          <Link href={`/admin/promotions/${p.id}`} className="text-brand-red hover:underline">
            Edit
          </Link>
          <button onClick={() => handleDelete(p)} className="text-error hover:underline">
            Delete
          </button>
        </div>
      )}
    />
  );
}
