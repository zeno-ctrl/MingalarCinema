import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { normalizeEmail } from "@/lib/utils";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { generateSecureToken } from "@/lib/crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const { success } = await rateLimit(`forgot-password:${ip}`, RATE_LIMITS.passwordReset);
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond the same way regardless of whether the account exists.
  if (user && user.passwordHash) {
    const token = generateSecureToken();
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        type: "PASSWORD_RESET",
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const resetUrl = `${env.APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    await sendPasswordResetEmail(email, resetUrl);
  }

  return NextResponse.json({ ok: true });
}
