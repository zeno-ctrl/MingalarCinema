import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { promoCodeSchema } from "@/lib/validations/admin";
import { recordAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const before = await prisma.promoCode.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = promoCodeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const code = parsed.data.code.toUpperCase();
  const promoCode = await prisma.promoCode.update({ where: { id }, data: { ...parsed.data, code } });
  await recordAudit({ actorId: user.id, action: "promo_code.update", entityType: "PromoCode", entityId: id, before, after: promoCode });
  return NextResponse.json({ promoCode });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const before = await prisma.promoCode.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.promoCode.delete({ where: { id } });
  await recordAudit({ actorId: user.id, action: "promo_code.delete", entityType: "PromoCode", entityId: id, before });
  return NextResponse.json({ ok: true });
}
