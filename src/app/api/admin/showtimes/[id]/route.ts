import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { showtimeSchema } from "@/lib/validations/admin";
import { hasOverlap, isMovieAllowedAtBranch, CLEANING_BUFFER_MIN } from "@/lib/showtime-overlap";
import { recordAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const before = await prisma.showtime.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
  if (await hasOverlap(hallId, startsAt, endsAt, id)) {
    return NextResponse.json({ error: "This overlaps with another showtime already scheduled in that hall." }, { status: 400 });
  }

  const showtime = await prisma.showtime.update({
    where: { id },
    data: { movieId, branchId, hallId, startsAt, endsAt, format, priceStandard, priceVip, priceCouple },
  });

  await recordAudit({ actorId: user.id, action: "showtime.update", entityType: "Showtime", entityId: id, before, after: showtime });
  return NextResponse.json({ showtime });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const before = await prisma.showtime.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bookingCount = await prisma.booking.count({
    where: { showtimeId: id, status: { in: ["PENDING", "PAID", "CHECKED_IN"] } },
  });
  if (bookingCount > 0) {
    return NextResponse.json({ error: "This showtime has active bookings and can't be deleted." }, { status: 400 });
  }

  await prisma.showtime.delete({ where: { id } });
  await recordAudit({ actorId: user.id, action: "showtime.delete", entityType: "Showtime", entityId: id, before });
  return NextResponse.json({ ok: true });
}
