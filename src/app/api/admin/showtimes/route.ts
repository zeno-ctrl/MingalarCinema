import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { showtimeSchema } from "@/lib/validations/admin";
import { hasOverlap, isMovieAllowedAtBranch, CLEANING_BUFFER_MIN } from "@/lib/showtime-overlap";
import { recordAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const { response } = await requireApiRole("ADMIN");
  if (response) return response;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");

  const showtimes = await prisma.showtime.findMany({
    where: from ? { startsAt: { gte: new Date(from) } } : undefined,
    include: { movie: true, branch: true, hall: true },
    orderBy: { startsAt: "asc" },
    take: 500,
  });
  return NextResponse.json({ showtimes });
}

export async function POST(req: Request) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = showtimeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { movieId, branchId, hallId, startsAt, format, priceStandard, priceVip, priceCouple } = parsed.data;

  const [movie, hall] = await Promise.all([
    prisma.movie.findUnique({ where: { id: movieId } }),
    prisma.hall.findUnique({ where: { id: hallId } }),
  ]);
  if (!movie || !hall) return NextResponse.json({ error: "Movie or hall not found" }, { status: 400 });
  if (hall.branchId !== branchId) {
    return NextResponse.json({ error: "That hall doesn't belong to the selected branch." }, { status: 400 });
  }
  if (!(await isMovieAllowedAtBranch(movieId, branchId))) {
    return NextResponse.json({ error: "This movie isn't assigned to that branch." }, { status: 400 });
  }

  const endsAt = new Date(startsAt.getTime() + (movie.runtimeMin + CLEANING_BUFFER_MIN) * 60 * 1000);
  if (await hasOverlap(hallId, startsAt, endsAt)) {
    return NextResponse.json({ error: "This overlaps with another showtime already scheduled in that hall." }, { status: 400 });
  }

  const showtime = await prisma.showtime.create({
    data: { movieId, branchId, hallId, startsAt, endsAt, format, priceStandard, priceVip, priceCouple },
  });

  await recordAudit({ actorId: user.id, action: "showtime.create", entityType: "Showtime", entityId: showtime.id, after: showtime });
  return NextResponse.json({ showtime });
}
