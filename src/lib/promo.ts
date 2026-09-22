import { prisma } from "@/lib/db";

export type PromoValidation =
  | { valid: true; promoCodeId: string; discount: number }
  | { valid: false; error: string };

export async function validatePromoCode(code: string, subtotal: number, userId: string): Promise<PromoValidation> {
  const promo = await prisma.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!promo || !promo.isActive) {
    return { valid: false, error: "This promo code isn't valid." };
  }
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return { valid: false, error: "This promo code has expired." };
  }
  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
    return { valid: false, error: "This promo code has reached its usage limit." };
  }
  if (subtotal < promo.minSpend) {
    return { valid: false, error: `This code requires a minimum spend of ${promo.minSpend} Ks.` };
  }
  const alreadyUsed = await prisma.promoCodeUse.findUnique({
    where: { promoCodeId_userId: { promoCodeId: promo.id, userId } },
  });
  if (alreadyUsed) {
    return { valid: false, error: "You've already used this promo code." };
  }

  const discount =
    promo.discountType === "PERCENTAGE" ? Math.round((subtotal * promo.amount) / 100) : Math.min(promo.amount, subtotal);

  return { valid: true, promoCodeId: promo.id, discount };
}
