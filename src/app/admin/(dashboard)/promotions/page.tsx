import Link from "next/link";
import { prisma } from "@/lib/db";
import { PromotionsTable } from "@/components/admin/promotions/PromotionsTable";

export default async function AdminPromotionsPage() {
  const promotions = await prisma.promotion.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Promotions & News</h1>
        <Link href="/admin/promotions/new" className="rounded-chip bg-brand-gradient px-4 py-2 text-sm font-medium text-white">
          + Add Promotion
        </Link>
      </div>
      <PromotionsTable
        promotions={promotions.map((p) => ({
          id: p.id,
          titleEn: p.titleEn,
          startDate: p.startDate.toISOString(),
          endDate: p.endDate.toISOString(),
          published: p.published,
        }))}
      />
    </div>
  );
}
