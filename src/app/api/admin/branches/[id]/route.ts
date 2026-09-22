import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { branchSchema } from "@/lib/validations/admin";
import { recordAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const before = await prisma.branch.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = branchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const branch = await prisma.branch.update({ where: { id }, data: parsed.data });
  await recordAudit({ actorId: user.id, action: "branch.update", entityType: "Branch", entityId: id, before, after: branch });
  return NextResponse.json({ branch });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const before = await prisma.branch.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hallCount = await prisma.hall.count({ where: { branchId: id } });
  if (hallCount > 0) {
    return NextResponse.json({ error: "Remove this branch's halls first, or deactivate it instead." }, { status: 400 });
  }

  await prisma.branch.delete({ where: { id } });
  await recordAudit({ actorId: user.id, action: "branch.delete", entityType: "Branch", entityId: id, before });
  return NextResponse.json({ ok: true });
}
