import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { promotionSchema } from "@/lib/validations/admin";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const { response } = await requireApiRole("ADMIN");
  if (response) return response;
  const promotions = await prisma.promotion.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ promotions });
}

export async function POST(req: Request) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = promotionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const promotion = await prisma.promotion.create({ data: { ...parsed.data, imageUrl: parsed.data.imageUrl || null } });
  await recordAudit({ actorId: user.id, action: "promotion.create", entityType: "Promotion", entityId: promotion.id, after: promotion });
  return NextResponse.json({ promotion });
}
