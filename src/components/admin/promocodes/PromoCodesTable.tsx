"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

type PromoCodeRow = {
  id: string;
  code: string;
  discountType: string;
  amount: number;
  usedCount: number;
  usageLimit: number | null;
  isActive: boolean;
};

export function PromoCodesTable({ promoCodes }: { promoCodes: PromoCodeRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { show } = useToast();

  async function handleDelete(p: PromoCodeRow) {
    const ok = await confirm({ title: `Delete "${p.code}"?`, danger: true, confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/admin/promo-codes/${p.id}`, { method: "DELETE" });
    if (!res.ok) return show("Failed to delete", "error");
    show("Promo code deleted");
    router.refresh();
  }

  const columns: Column<PromoCodeRow>[] = [
    { key: "code", header: "Code", render: (p) => p.code, sortValue: (p) => p.code },
    {
      key: "amount",
      header: "Discount",
      render: (p) => (p.discountType === "PERCENTAGE" ? `${p.amount}%` : `${p.amount} Ks`),
    },
    { key: "usedCount", header: "Used", render: (p) => `${p.usedCount}${p.usageLimit ? ` / ${p.usageLimit}` : ""}` },
    { key: "isActive", header: "Status", render: (p) => (p.isActive ? "Active" : "Inactive") },
  ];

  return (
    <DataTable
      columns={columns}
      rows={promoCodes}
      searchFn={(p, q) => p.code.toLowerCase().includes(q)}
      searchPlaceholder="Search promo codes..."
      actions={(p) => (
        <div className="flex justify-end gap-3 text-sm">
          <Link href={`/admin/promo-codes/${p.id}`} className="text-brand-red hover:underline">
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
