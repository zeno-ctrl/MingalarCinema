import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { siteSettingsSchema } from "@/lib/validations/admin";
import { recordAudit } from "@/lib/audit";

export async function PATCH(req: Request) {
  const { user, response } = await requireApiRole("SUPER_ADMIN");
  if (response) return response;

  const before = await prisma.setting.findUnique({ where: { key: "brand" } });

  const body = await req.json().catch(() => null);
  const parsed = siteSettingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const setting = await prisma.setting.upsert({
    where: { key: "brand" },
    create: { key: "brand", value: parsed.data },
    update: { value: parsed.data },
  });

  await recordAudit({ actorId: user.id, action: "settings.update", entityType: "Setting", entityId: "brand", before, after: setting });
  return NextResponse.json({ setting });
}
