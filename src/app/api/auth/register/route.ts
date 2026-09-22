import { NextResponse } from "next/server";
import argon2 from "argon2";
import { prisma } from "@/lib/db";
import { signupSchema } from "@/lib/validations/auth";
import { normalizeEmail } from "@/lib/utils";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { generateSecureToken } from "@/lib/crypto";
import { sendVerificationEmail } from "@/lib/email";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const { success } = await rateLimit(`signup:${ip}`, RATE_LIMITS.signup);
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Don't reveal whether the account exists; respond identically to success.
    return NextResponse.json({ ok: true });
  }

  const passwordHash = await argon2.hash(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      passwordHash,
    },
  });

  const token = generateSecureToken();
  await prisma.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      type: "EMAIL_VERIFY",
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const verifyUrl = `${env.APP_URL}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;
  await sendVerificationEmail(user.email, verifyUrl);

  return NextResponse.json({ ok: true });
}
