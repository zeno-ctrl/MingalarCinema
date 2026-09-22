import { NextResponse } from "next/server";
import { z } from "zod";
import argon2 from "argon2";
import { prisma } from "@/lib/db";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const { success } = await rateLimit(`accept-invite:${ip}`, RATE_LIMITS.signup);
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const invite = await prisma.adminInvite.findUnique({ where: { token: parsed.data.token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite link is invalid or has expired." }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
  }

  const passwordHash = await argon2.hash(parsed.data.password);
  await prisma.$transaction([
    prisma.user.create({
      data: {
        email: invite.email,
        name: parsed.data.name,
        passwordHash,
        role: invite.role,
        emailVerified: new Date(),
      },
    }),
    prisma.adminInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);

  return NextResponse.json({ ok: true, email: invite.email });
}
