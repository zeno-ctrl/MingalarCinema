import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { movieSchema } from "@/lib/validations/admin";
import { recordAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const movie = await prisma.movie.findUnique({ where: { id }, include: { branches: true } });
  if (!movie) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ movie });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const before = await prisma.movie.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = movieSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { branchIds, ...data } = parsed.data;

  const movie = await prisma.$transaction(async (tx) => {
    const updated = await tx.movie.update({
      where: { id },
      data: {
        ...data,
        subtitles: data.subtitles || null,
        bannerUrl: data.bannerUrl || null,
        trailerUrl: data.trailerUrl || null,
      },
    });
    await tx.movieBranch.deleteMany({ where: { movieId: id } });
    if (!data.allBranches && branchIds.length > 0) {
      await tx.movieBranch.createMany({ data: branchIds.map((branchId) => ({ movieId: id, branchId })) });
    }
    return updated;
  });

  await recordAudit({ actorId: user.id, action: "movie.update", entityType: "Movie", entityId: id, before, after: movie });

  return NextResponse.json({ movie });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const before = await prisma.movie.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const showtimeCount = await prisma.showtime.count({ where: { movieId: id } });
  if (showtimeCount > 0) {
    return NextResponse.json(
      { error: "This movie has showtimes scheduled. Remove them first, or set status to Ended instead." },
      { status: 400 },
    );
  }

  await prisma.movie.delete({ where: { id } });
  await recordAudit({ actorId: user.id, action: "movie.delete", entityType: "Movie", entityId: id, before });

  return NextResponse.json({ ok: true });
}
