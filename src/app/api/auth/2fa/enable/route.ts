import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth-helpers";
import { verifyTotp, generateRecoveryCodes, hashRecoveryCode } from "@/lib/twofactor";
import { encryptSecret } from "@/lib/crypto";
import { recordAudit } from "@/lib/audit";

const schema = z.object({
  secret: z.string().min(1),
  token: z.string().length(6).regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!verifyTotp(parsed.data.token, parsed.data.secret)) {
    return NextResponse.json({ error: "That code didn't match. Check your authenticator app and try again." }, { status: 400 });
  }

  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorSecret: encryptSecret(parsed.data.secret),
      twoFactorEnabled: true,
      twoFactorRecoveryCodes: recoveryCodes.map(hashRecoveryCode),
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "user.2fa_enabled",
    entityType: "User",
    entityId: user.id,
  });

  return NextResponse.json({ ok: true, recoveryCodes });
}
