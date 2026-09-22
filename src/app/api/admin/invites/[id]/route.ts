import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("SUPER_ADMIN");
  if (response) return response;

  const { id } = await params;
  const invite = await prisma.adminInvite.findUnique({ where: { id } });
  if (!invite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.adminInvite.delete({ where: { id } });
  await recordAudit({
    actorId: user.id,
    action: "admin_invite.revoke",
    entityType: "AdminInvite",
    entityId: id,
    before: { email: invite.email, role: invite.role },
  });

  return NextResponse.json({ ok: true });
}
