import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { inviteAdminSchema } from "@/lib/validations/auth";
import { normalizeEmail } from "@/lib/utils";
import { generateSecureToken } from "@/lib/crypto";
import { sendAdminInviteEmail } from "@/lib/email";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";

export async function GET() {
  const { user, response } = await requireApiRole("SUPER_ADMIN");
  if (response) return response;
  void user;

  const invites = await prisma.adminInvite.findMany({
    orderBy: { createdAt: "desc" },
    include: { invitedBy: { select: { name: true, email: true } } },
  });
  return NextResponse.json({ invites });
}

export async function POST(req: Request) {
  const { user, response } = await requireApiRole("SUPER_ADMIN");
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = inviteAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 400 });
  }

  const token = generateSecureToken();
  const invite = await prisma.adminInvite.create({
    data: {
      email,
      role: parsed.data.role,
      token,
      invitedById: user.id,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  const inviteUrl = `${env.APP_URL}/accept-invite/${token}`;
  await sendAdminInviteEmail(email, inviteUrl, parsed.data.role);

  await recordAudit({
    actorId: user.id,
    action: "admin_invite.create",
    entityType: "AdminInvite",
    entityId: invite.id,
    after: { email, role: parsed.data.role },
  });

  return NextResponse.json({ ok: true, invite: { id: invite.id, email: invite.email, role: invite.role } });
}
