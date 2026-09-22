import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { bulkShowtimeSchema } from "@/lib/validations/admin";
import { hasOverlap, isMovieAllowedAtBranch } from "@/lib/showtime-overlap";
import { recordAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = bulkShowtimeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const {
    movieId,
    branchId,
    hallId,
    startDate,
    endDate,
    times,
    format,
    priceStandard,
    priceVip,
    priceCouple,
    cleaningBufferMin,
  } = parsed.data;

  if (endDate < startDate) {
    return NextResponse.json({ error: "End date must be after start date." }, { status: 400 });
  }

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

  const candidates: { startsAt: Date; endsAt: Date }[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(endDate);
  last.setHours(0, 0, 0, 0);

  while (cursor <= last) {
    for (const time of times) {
      const [h, m] = time.split(":").map(Number);
      const startsAt = new Date(cursor);
      startsAt.setHours(h, m, 0, 0);
      if (startsAt < new Date()) continue;
      const endsAt = new Date(startsAt.getTime() + (movie.runtimeMin + cleaningBufferMin) * 60 * 1000);
      candidates.push({ startsAt, endsAt });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  let created = 0;
  let skipped = 0;
  const createdIds: string[] = [];

  for (const c of candidates) {
    if (await hasOverlap(hallId, c.startsAt, c.endsAt)) {
      skipped++;
      continue;
    }
    const showtime = await prisma.showtime.create({
      data: {
        movieId,
        branchId,
        hallId,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        format,
        priceStandard,
        priceVip,
        priceCouple,
      },
    });
    createdIds.push(showtime.id);
    created++;
  }

  await recordAudit({
    actorId: user.id,
    action: "showtime.bulk_create",
    entityType: "Showtime",
    entityId: hallId,
    after: { created, skipped, movieId, branchId, hallId },
  });

  return NextResponse.json({ created, skipped, total: candidates.length });
}
