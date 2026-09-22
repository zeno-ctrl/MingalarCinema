import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PromotionForm } from "@/components/admin/promotions/PromotionForm";

export default async function EditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const promotion = await prisma.promotion.findUnique({ where: { id } });
  if (!promotion) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Edit Promotion</h1>
      <PromotionForm
        promotionId={promotion.id}
        initial={{
          titleEn: promotion.titleEn,
          titleMm: promotion.titleMm,
          bodyEn: promotion.bodyEn,
          bodyMm: promotion.bodyMm,
          imageUrl: promotion.imageUrl || "",
          startDate: promotion.startDate.toISOString().slice(0, 10),
          endDate: promotion.endDate.toISOString().slice(0, 10),
          published: promotion.published,
        }}
      />
    </div>
  );
}
