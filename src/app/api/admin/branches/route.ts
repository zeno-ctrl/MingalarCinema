import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { branchSchema } from "@/lib/validations/admin";
import { slugify } from "@/lib/utils";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const { response } = await requireApiRole("ADMIN");
  if (response) return response;
  const branches = await prisma.branch.findMany({ orderBy: { nameEn: "asc" } });
  return NextResponse.json({ branches });
}

export async function POST(req: Request) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = branchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const baseSlug = slugify(parsed.data.nameEn);
  let slug = baseSlug;
  let n = 1;
  while (await prisma.branch.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const branch = await prisma.branch.create({ data: { ...parsed.data, slug } });
  await recordAudit({ actorId: user.id, action: "branch.create", entityType: "Branch", entityId: branch.id, after: branch });
  return NextResponse.json({ branch });
}
