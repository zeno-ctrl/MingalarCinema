import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole, getCurrentUser } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { generateSecureToken } from "@/lib/crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { env } from "@/lib/env";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireApiRole("ADMIN");
  if (response) return response;
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { success } = await rateLimit(`admin-password-reset:${currentUser.id}`, RATE_LIMITS.passwordReset);
  if (!success) {
    return NextResponse.json({ error: "Too many reset emails sent. Please wait a while." }, { status: 429 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = generateSecureToken();
  await prisma.verificationToken.deleteMany({ where: { identifier: user.email, type: "PASSWORD_RESET" } });
  await prisma.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      type: "PASSWORD_RESET",
      expires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const resetUrl = `${env.APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  await recordAudit({
    actorId: currentUser.id,
    action: "user.password_reset_sent",
    entityType: "User",
    entityId: id,
    before: null,
    after: null,
  });

  return NextResponse.json({ ok: true });
}
