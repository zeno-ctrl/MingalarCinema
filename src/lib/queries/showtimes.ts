import { prisma } from "@/lib/db";

function dayRange(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59.999`);
  return { start, end };
}

export function getShowtimesForMovie(movieId: string, dateStr: string, branchId?: string) {
  const { start, end } = dayRange(dateStr);
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
  const { start, end } = dayRange(dateStr);
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
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
