import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requestLoginCodeSchema } from "@/lib/validations/auth";
import { normalizeEmail } from "@/lib/utils";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { generateNumericCode } from "@/lib/crypto";
import { sendLoginCodeEmail } from "@/lib/email";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_TOKEN_COLLISION_RETRIES = 5;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const { success } = await rateLimit(`login-code-request:${ip}`, RATE_LIMITS.loginCodeRequest);
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = requestLoginCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const { success: emailOk } = await rateLimit(`login-code-request:${email}`, RATE_LIMITS.loginCodeRequest);

  // Always respond the same way regardless of whether the account exists or
  // this specific email hit its own throttle, so neither is enumerable.
  if (emailOk) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.isDisabled) {
      await prisma.verificationToken.deleteMany({ where: { identifier: email, type: "LOGIN_CODE" } });

      for (let attempt = 0; attempt < MAX_TOKEN_COLLISION_RETRIES; attempt++) {
        const code = generateNumericCode(6);
        try {
          await prisma.verificationToken.create({
            data: {
              identifier: email,
              token: code,
              type: "LOGIN_CODE",
              expires: new Date(Date.now() + CODE_TTL_MS),
            },
          });
          await sendLoginCodeEmail(email, code);
          break;
        } catch (err) {
          const isCollision = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
          if (!isCollision || attempt === MAX_TOKEN_COLLISION_RETRIES - 1) throw err;
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
