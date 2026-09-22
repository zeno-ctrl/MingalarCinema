import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { promotionSchema } from "@/lib/validations/admin";
import { recordAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const before = await prisma.promotion.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = promotionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const promotion = await prisma.promotion.update({ where: { id }, data: { ...parsed.data, imageUrl: parsed.data.imageUrl || null } });
  await recordAudit({ actorId: user.id, action: "promotion.update", entityType: "Promotion", entityId: id, before, after: promotion });
  return NextResponse.json({ promotion });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const before = await prisma.promotion.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.promotion.delete({ where: { id } });
  await recordAudit({ actorId: user.id, action: "promotion.delete", entityType: "Promotion", entityId: id, before });
  return NextResponse.json({ ok: true });
}
