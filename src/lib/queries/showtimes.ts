import { prisma } from "@/lib/db";
import { cinemaDate, cinemaDayRange } from "@/lib/cinema-time";

export function getShowtimesForMovie(movieId: string, dateStr: string, branchId?: string) {
  const { start, end } = cinemaDayRange(dateStr);
  return prisma.showtime.findMany({
    where: {
      movieId,
      startsAt: { gte: start, lte: end },
      ...(branchId ? { branchId } : {}),
    },
    include: { branch: true, hall: true },
    orderBy: [{ branchId: "asc" }, { startsAt: "asc" }],
  });
}

export function getShowtimesForBranch(branchId: string, dateStr: string) {
  const { start, end } = cinemaDayRange(dateStr);
  return prisma.showtime.findMany({
    where: { branchId, startsAt: { gte: start, lte: end } },
    include: { movie: true, hall: true },
    orderBy: [{ movieId: "asc" }, { startsAt: "asc" }],
  });
}

export function getShowtimeById(id: string) {
  return prisma.showtime.findUnique({
    where: { id },
    include: { movie: true, branch: true, hall: { include: { seats: { orderBy: [{ row: "asc" }, { column: "asc" }] } } } },
  });
}

export function todayStr(offsetDays = 0): string {
  return cinemaDate(offsetDays);
}
