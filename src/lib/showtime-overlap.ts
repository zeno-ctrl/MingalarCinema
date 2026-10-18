import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cinemaDate } from "@/lib/cinema-time";

export async function lockShowtimeSchedule(tx: Prisma.TransactionClient, branchId: string, dateStr: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`automatic-showtimes:${branchId}:${dateStr}`}))`;
}

/** A performance crossing midnight occupies both Myanmar dates. */
export async function lockShowtimeInterval(tx: Prisma.TransactionClient, branchId: string, startsAt: Date, endsAt: Date): Promise<void> {
  const cursor = new Date(`${cinemaDate(0, startsAt)}T12:00:00Z`);
  const lastDate = cinemaDate(0, new Date(endsAt.getTime() - 1));
  while (cursor.toISOString().slice(0, 10) <= lastDate) {
    await lockShowtimeSchedule(tx, branchId, cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

export async function hasOverlap(
  hallId: string,
  startsAt: Date,
  endsAt: Date,
  excludeShowtimeId?: string,
  db: Pick<Prisma.TransactionClient, "showtime"> = prisma,
) {
  const overlapping = await db.showtime.findFirst({
    where: {
      hallId,
      id: excludeShowtimeId ? { not: excludeShowtimeId } : undefined,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  return !!overlapping;
}

export async function isMovieAllowedAtBranch(movieId: string, branchId: string): Promise<boolean> {
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) return false;
  if (movie.allBranches) return true;
  const link = await prisma.movieBranch.findUnique({ where: { movieId_branchId: { movieId, branchId } } });
  return !!link;
}

export const CLEANING_BUFFER_MIN = 20;
