import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PromoCodeForm } from "@/components/admin/promocodes/PromoCodeForm";

export default async function EditPromoCodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const promoCode = await prisma.promoCode.findUnique({ where: { id } });
  if (!promoCode) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Edit Promo Code</h1>
      <PromoCodeForm
        promoCodeId={promoCode.id}
        initial={{
          code: promoCode.code,
          discountType: promoCode.discountType,
          amount: promoCode.amount,
          minSpend: promoCode.minSpend,
          usageLimit: promoCode.usageLimit?.toString() || "",
          expiresAt: promoCode.expiresAt?.toISOString().slice(0, 10) || "",
          isActive: promoCode.isActive,
        }}
      />
    </div>
  );
}
