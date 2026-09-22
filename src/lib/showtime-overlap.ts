import { prisma } from "@/lib/db";

export async function hasOverlap(hallId: string, startsAt: Date, endsAt: Date, excludeShowtimeId?: string) {
  const overlapping = await prisma.showtime.findFirst({
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
