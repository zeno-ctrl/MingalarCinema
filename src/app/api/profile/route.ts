import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth-helpers";
import { updateProfileSchema } from "@/lib/validations/auth";

export async function PATCH(req: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      language: parsed.data.language,
    },
  });

  return NextResponse.json({ ok: true });
}
