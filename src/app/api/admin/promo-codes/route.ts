import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { promoCodeSchema } from "@/lib/validations/admin";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const { response } = await requireApiRole("ADMIN");
  if (response) return response;
  const promoCodes = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ promoCodes });
}

export async function POST(req: Request) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = promoCodeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const code = parsed.data.code.toUpperCase();
  const existing = await prisma.promoCode.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: "A promo code with this code already exists." }, { status: 400 });

  const promoCode = await prisma.promoCode.create({ data: { ...parsed.data, code } });
  await recordAudit({ actorId: user.id, action: "promo_code.create", entityType: "PromoCode", entityId: promoCode.id, after: promoCode });
  return NextResponse.json({ promoCode });
}
