import { NextResponse } from "next/server";
import argon2 from "argon2";
import { prisma } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const { success } = await rateLimit(`reset-password:${ip}`, RATE_LIMITS.passwordReset);
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const record = await prisma.verificationToken.findFirst({
    where: { token: parsed.data.token, type: "PASSWORD_RESET" },
  });
  if (!record || record.expires < new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await argon2.hash(parsed.data.password);
  await prisma.$transaction([
    prisma.user.update({
      where: { email: record.identifier },
      data: {
        passwordHash,
        failedLoginCount: 0,
        lockedUntil: null,
        sessionVersion: { increment: 1 }, // also logs out all existing sessions
      },
    }),
    prisma.verificationToken.deleteMany({ where: { identifier: record.identifier, type: "PASSWORD_RESET" } }),
  ]);

  return NextResponse.json({ ok: true });
}
