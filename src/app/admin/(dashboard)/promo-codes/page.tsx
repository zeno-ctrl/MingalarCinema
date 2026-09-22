import Link from "next/link";
import { prisma } from "@/lib/db";
import { PromoCodesTable } from "@/components/admin/promocodes/PromoCodesTable";

export default async function AdminPromoCodesPage() {
  const promoCodes = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Promo Codes</h1>
        <Link href="/admin/promo-codes/new" className="rounded-chip bg-brand-gradient px-4 py-2 text-sm font-medium text-white">
          + Add Promo Code
        </Link>
      </div>
      <PromoCodesTable
        promoCodes={promoCodes.map((p) => ({
          id: p.id,
          code: p.code,
          discountType: p.discountType,
          amount: p.amount,
          usedCount: p.usedCount,
          usageLimit: p.usageLimit,
          isActive: p.isActive,
        }))}
      />
    </div>
  );
}
