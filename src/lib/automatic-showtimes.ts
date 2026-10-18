import { createHash } from "node:crypto";
import { MovieFormat, MovieStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cinemaDate, cinemaDayRange } from "@/lib/cinema-time";
import { lockShowtimeSchedule } from "@/lib/showtime-overlap";

const MINUTE = 60_000;
const BOOKING_NOTICE_MINUTES = 15;
const CLEANING_MINUTES = 20;

export type AutomaticScheduleMovie = {
  id: string;
  runtimeMin: number;
  formats: MovieFormat[];
  status: MovieStatus;
  releaseDate: Date;
  allBranches: boolean;
  branchIds: string[];
};

export type AutomaticScheduleInterval = {
  movieId: string;
  hallId: string;
  startsAt: Date;
  endsAt: Date;
};

export type AutomaticScheduleInput = {
  dateStr: string;
  now: Date;
  branch: { id: string; openingHours: string };
  halls: { id: string; branchId: string }[];
  movies: AutomaticScheduleMovie[];
  existing: AutomaticScheduleInterval[];
  prices?: { movieId: string; priceStandard: number; priceCouple: number }[];
};

/** Only the seven dates offered by the public date picker may create schedules. */
export function isAutomaticShowtimeDate(dateStr: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parsed = new Date(`${dateStr}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === dateStr &&
    dateStr >= cinemaDate(0, now) &&
    dateStr <= cinemaDate(6, now)
  );
}

function automaticShowtimesEnabled(value: Prisma.JsonValue | undefined): boolean {
  return !(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.automaticShowtimes === false
  );
}

function stableKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function openingMinutes(openingHours: string): { open: number; close: number } {
  const match = openingHours.match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/);
  if (match) {
    const [, openHour, openMinute, closeHour, closeMinute] = match.map(Number);
    const open = openHour * 60 + openMinute;
    const close = closeHour * 60 + closeMinute;
    if (
      openHour < 24 && openMinute < 60 && closeMinute < 60 &&
      closeHour <= 24 && (closeHour !== 24 || closeMinute === 0) && close > open
    ) {
      return { open, close };
    }
  }
  return { open: 10 * 60, close: 23 * 60 };
}

/** Produce stable, varied times without changing any existing schedule. */
export function planAutomaticShowtimes(input: AutomaticScheduleInput): Prisma.ShowtimeCreateManyInput[] {
  const { dateStr, now, branch, existing } = input;
  if (!isAutomaticShowtimeDate(dateStr, now)) return [];

  const { start, end } = cinemaDayRange(dateStr);
  const { open, close } = openingMinutes(branch.openingHours);
  const earliest = Math.max(start.getTime() + open * MINUTE, now.getTime() + BOOKING_NOTICE_MINUTES * MINUTE);
  const closesAt = start.getTime() + close * MINUTE;
  const halls = input.halls.filter((hall) => hall.branchId === branch.id);
  const hallIds = new Set(halls.map((hall) => hall.id));
  if (halls.length === 0 || earliest >= closesAt) return [];

  const coveredMovies = new Set(
    existing
      .filter((showtime) =>
        hallIds.has(showtime.hallId) &&
        showtime.startsAt.getTime() >= earliest && showtime.startsAt <= end,
      )
      .map((showtime) => showtime.movieId),
  );
  const seed = `${branch.id}:${dateStr}`;
  const missingMovies = input.movies.filter((movie) =>
    !coveredMovies.has(movie.id) &&
    Number.isFinite(movie.runtimeMin) && movie.runtimeMin > 0 &&
    (movie.allBranches || movie.branchIds.includes(branch.id)) &&
    (
      movie.status === MovieStatus.NOW_SHOWING ||
      (movie.status === MovieStatus.COMING_SOON && movie.releaseDate <= end)
    ),
  ).sort((a, b) =>
    b.runtimeMin - a.runtimeMin || stableKey(`${seed}:${a.id}`).localeCompare(stableKey(`${seed}:${b.id}`)),
  );

  const occupied = [...existing];
  const planned: Prisma.ShowtimeCreateManyInput[] = [];
  const prices = new Map(input.prices?.map((price) => [price.movieId, price]));

  function placeMovie(movie: AutomaticScheduleMovie, pass: number): boolean {
    const duration = (movie.runtimeMin + CLEANING_MINUTES) * MINUTE;
    const candidates: { hallId: string; startsAt: number; order: string }[] = [];
    for (let minute = Math.ceil(open / 30) * 30; minute < close; minute += 30) {
      const startsAt = start.getTime() + minute * MINUTE;
      if (startsAt < earliest || startsAt + duration > closesAt) continue;
      for (const hall of halls) {
        candidates.push({
          hallId: hall.id,
          startsAt,
          order: stableKey(`${seed}:${movie.id}:${pass}:${hall.id}:${minute}`),
        });
      }
    }
    candidates.sort((a, b) => a.order.localeCompare(b.order));
    const candidate = candidates.find(({ hallId, startsAt }) => !occupied.some((interval) =>
      interval.hallId === hallId && interval.startsAt.getTime() < startsAt + duration && interval.endsAt.getTime() > startsAt,
    ));
    if (!candidate) return false;

    const startsAt = new Date(candidate.startsAt);
    const endsAt = new Date(candidate.startsAt + duration);
    const template = prices.get(movie.id);
    const showtime: Prisma.ShowtimeCreateManyInput = {
      id: `auto_${stableKey(`${seed}:${movie.id}:${candidate.hallId}:${startsAt.toISOString()}`).slice(0, 40)}`,
      movieId: movie.id,
      branchId: branch.id,
      hallId: candidate.hallId,
      startsAt,
      endsAt,
      format: movie.formats[0] ?? MovieFormat.D2,
      priceStandard: template?.priceStandard ?? 6000,
      priceCouple: template?.priceCouple ?? 16000,
    };
    planned.push(showtime);
    occupied.push({ movieId: movie.id, hallId: candidate.hallId, startsAt, endsAt });
    return true;
  }

  // Give each missing movie its first showing before using spare room for repeats.
  let firstShowings = 0;
  for (const movie of missingMovies) {
    if (placeMovie(movie, 0)) firstShowings++;
  }
  if (firstShowings === missingMovies.length) {
    for (const movie of missingMovies) placeMovie(movie, 1);
  }
  return planned;
}

/**
 * Keep this demonstration site's visible week bookable. The administrator can
 * disable generation in brand settings when using an operator-managed schedule.
 */
export async function ensureAutomaticShowtimes(dateStr: string, branchId?: string): Promise<void> {
  if (!isAutomaticShowtimeDate(dateStr)) return;
  const brand = await prisma.setting.findUnique({ where: { key: "brand" }, select: { value: true } });
  if (!automaticShowtimesEnabled(brand?.value)) return;

  const branches = await prisma.branch.findMany({
    where: { isActive: true, ...(branchId ? { id: branchId } : {}) },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  for (const branch of branches) {
    await prisma.$transaction(async (tx) => {
      // The lock protects against duplicate generation in concurrent Vercel workers.
      // Re-read all scheduling decisions after acquiring it.
      await lockShowtimeSchedule(tx, branch.id, dateStr);
      const currentBrand = await tx.setting.findUnique({ where: { key: "brand" }, select: { value: true } });
      if (!automaticShowtimesEnabled(currentBrand?.value)) return;
      const now = new Date();
      if (!isAutomaticShowtimeDate(dateStr, now)) return;
      const activeBranch = await tx.branch.findFirst({
        where: { id: branch.id, isActive: true },
        select: { id: true, openingHours: true },
      });
      if (!activeBranch) return;
      const { start, end } = cinemaDayRange(dateStr);
      const [halls, movies, existing, prices] = await Promise.all([
        tx.hall.findMany({
          where: { branchId: branch.id, seats: { some: { isDisabled: false } } },
          select: { id: true, branchId: true },
          orderBy: { id: "asc" },
        }),
        tx.movie.findMany({
          where: {
            AND: [
              { OR: [{ status: MovieStatus.NOW_SHOWING }, { status: MovieStatus.COMING_SOON, releaseDate: { lte: end } }] },
              { OR: [{ allBranches: true }, { branches: { some: { branchId: branch.id } } }] },
            ],
          },
          select: {
            id: true, runtimeMin: true, formats: true, status: true,
            releaseDate: true, allBranches: true, branches: { select: { branchId: true } },
          },
        }),
        tx.showtime.findMany({
          where: { branchId: branch.id, endsAt: { gt: start }, startsAt: { lt: new Date(end.getTime() + 1) } },
          select: { movieId: true, hallId: true, startsAt: true, endsAt: true },
        }),
        tx.showtime.findMany({
          where: { branchId: branch.id },
          distinct: ["movieId"],
          orderBy: { startsAt: "desc" },
          select: { movieId: true, priceStandard: true, priceCouple: true },
        }),
      ]);
      const planned = planAutomaticShowtimes({
        dateStr, now, branch: activeBranch, halls,
        movies: movies.map(({ branches: links, ...movie }) => ({ ...movie, branchIds: links.map((link) => link.branchId) })),
        existing, prices,
      });
      if (planned.length > 0) await tx.showtime.createMany({ data: planned, skipDuplicates: true });
    }, { maxWait: 10_000, timeout: 20_000 });
  }
}
