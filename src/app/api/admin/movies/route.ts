import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { movieSchema } from "@/lib/validations/admin";
import { slugify } from "@/lib/utils";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const { response } = await requireApiRole("ADMIN");
  if (response) return response;

  const movies = await prisma.movie.findMany({
    include: { branches: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ movies });
}

export async function POST(req: Request) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = movieSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { branchIds, ...data } = parsed.data;
  const baseSlug = slugify(data.title);
  let slug = baseSlug;
  let n = 1;
  while (await prisma.movie.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const movie = await prisma.movie.create({
    data: {
      ...data,
      slug,
      subtitles: data.subtitles || null,
      bannerUrl: data.bannerUrl || null,
      trailerUrl: data.trailerUrl || null,
      branches: data.allBranches ? undefined : { create: branchIds.map((branchId) => ({ branchId })) },
    },
  });

  await recordAudit({ actorId: user.id, action: "movie.create", entityType: "Movie", entityId: movie.id, after: movie });

  return NextResponse.json({ movie });
}
