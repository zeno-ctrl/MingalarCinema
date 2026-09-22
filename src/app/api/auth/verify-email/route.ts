import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(`${env.APP_URL}/login?error=invalid_verification`);
  }

  const record = await prisma.verificationToken.findFirst({
    where: { token, identifier: email, type: "EMAIL_VERIFY" },
  });

  if (!record || record.expires < new Date()) {
    return NextResponse.redirect(`${env.APP_URL}/login?error=expired_verification`);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.delete({ where: { id: record.id } }),
  ]);

  return NextResponse.redirect(`${env.APP_URL}/login?verified=1`);
}
