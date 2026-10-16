import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import argon2 from "argon2";
import { prisma } from "@/lib/db";
import { signupSchema } from "@/lib/validations/auth";
import { normalizeEmail } from "@/lib/utils";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

function registrationConflict() {
  return NextResponse.json(
    { error: "Unable to create an account with those details. Please sign in or reset your password." },
    { status: 409 },
  );
}

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
    // Only a newly created account is a successful signup. The client signs
    // it in next, so never report success for an existing account.
    return registrationConflict();
  }

  const passwordHash = await argon2.hash(parsed.data.password);
  try {
    await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        passwordHash,
        emailVerified: new Date(),
        isDisabled: false,
      },
    });
  } catch (error) {
    // Two simultaneous submissions must not turn an existing email into a 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return registrationConflict();
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
