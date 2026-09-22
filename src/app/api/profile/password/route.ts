import { NextResponse } from "next/server";
import argon2 from "argon2";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth-helpers";
import { changePasswordSchema } from "@/lib/validations/auth";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const { success } = await rateLimit(`change-password:${user.id}:${clientIp(req)}`, RATE_LIMITS.login);
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.passwordHash) {
    return NextResponse.json(
      { error: "This account signs in with Google and has no password set." },
      { status: 400 },
    );
  }

  const valid = await argon2.verify(dbUser.passwordHash, parsed.data.currentPassword);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const passwordHash = await argon2.hash(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}
