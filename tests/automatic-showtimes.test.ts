import { randomUUID } from "node:crypto";
import { Prisma, type MovieStatus } from "@prisma/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ensureAutomaticShowtimes } from "@/lib/automatic-showtimes";
import { cinemaDate, cinemaDayRange } from "@/lib/cinema-time";
import { prisma } from "@/lib/db";
import { acquireSeatHold } from "@/lib/seat-lock";
import { hasOverlap, lockShowtimeInterval } from "@/lib/showtime-overlap";

/**
 * These tests use real Postgres: concurrent page requests must not create
 * overlapping or duplicate persisted performances, and generated IDs must
 * work with the actual seat-hold code. Run only against a local test database.
 * Every cinema/movie/user fixture belongs to this suite and is removed below.
 */
let originalBrand: Prisma.JsonValue | undefined;
let capturedBrand = false;
let prefix = "";
let branchId = "";
let userId = "";
let hallIds: string[] = [];
let movieIds: string[] = [];
let releasedComingSoonId = "";
let excludedMovieIds: string[] = [];

async function setAutomaticShowtimes(enabled: boolean) {
  const row = await prisma.setting.findUnique({ where: { key: "brand" } });
  const current = row?.value;
  const value = {
    ...(current && typeof current === "object" && !Array.isArray(current) ? current : {}),
    automaticShowtimes: enabled,
  };
  await prisma.setting.upsert({ where: { key: "brand" }, create: { key: "brand", value }, update: { value } });
}

beforeAll(async () => {
  const host = new URL(process.env.DATABASE_URL ?? "").hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
    throw new Error("Automatic showtime integration tests require a local, migrated test database.");
  }
  originalBrand = (await prisma.setting.findUnique({ where: { key: "brand" } }))?.value;
  capturedBrand = true;
});

beforeEach(async () => {
  prefix = `auto-showtime-test-${randomUUID()}`;
  await setAutomaticShowtimes(true);
  const branchData = (suffix: string) => ({
    nameEn: `${prefix}-${suffix}`, nameMm: prefix, slug: `${prefix}-${suffix}`,
    addressEn: "Integration test only", addressMm: "Integration test only", phone: "000000000",
    openingHours: "00:00-23:59", isActive: true,
  });
  const branch = await prisma.branch.create({
    data: {
      ...branchData("main"),
      halls: {
        create: ["A", "B"].map((name) => ({
          name, rows: 1, columns: 2,
          seats: { create: [1, 2].map((column) => ({ row: "A", column, label: `A${column}` })) },
        })),
      },
    },
    include: { halls: { orderBy: { name: "asc" } } },
  });
  branchId = branch.id;
  hallIds = branch.halls.map((hall) => hall.id);
  const otherBranch = await prisma.branch.create({ data: branchData("other") });
  const createMovie = (name: string, status: MovieStatus, releaseDate: Date, movieBranchId = branchId) =>
    prisma.movie.create({
      data: {
        title: `${prefix}-${name}`, slug: `${prefix}-${name}`, synopsis: "Integration test only",
        director: "Test", rating: "G", runtimeMin: 80, language: "English", formats: ["D2"],
        posterUrl: "/test-poster.jpg", releaseDate, status, allBranches: false,
        branches: { create: { branchId: movieBranchId } },
      },
    });
  const oldRelease = new Date("2020-01-01T00:00:00Z");
  movieIds = [];
  for (const name of ["now-one", "now-two", "now-three"]) {
    movieIds.push((await createMovie(name, "NOW_SHOWING", oldRelease)).id);
  }
  releasedComingSoonId = (await createMovie("released-coming", "COMING_SOON", cinemaDayRange(cinemaDate(1)).start)).id;
  excludedMovieIds = [
    (await createMovie("unreleased", "COMING_SOON", cinemaDayRange(cinemaDate(10)).start)).id,
    (await createMovie("ended", "ENDED", oldRelease)).id,
    (await createMovie("another-branch", "NOW_SHOWING", oldRelease, otherBranch.id)).id,
  ];
  userId = (await prisma.user.create({ data: { name: prefix, email: `${prefix}@example.test` } })).id;
});

afterEach(async () => {
  if (!prefix) return;
  await prisma.booking.deleteMany({ where: { showtime: { branch: { slug: { startsWith: prefix } } } } });
  await prisma.branch.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.movie.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { email: `${prefix}@example.test` } });
});

afterAll(async () => {
  try {
    if (capturedBrand) {
      if (originalBrand === undefined) {
        await prisma.setting.deleteMany({ where: { key: "brand" } });
      } else {
        const value = originalBrand === null ? Prisma.JsonNull : originalBrand;
        await prisma.setting.upsert({ where: { key: "brand" }, create: { key: "brand", value }, update: { value } });
      }
    }
  } finally {
    await prisma.$disconnect();
  }
});

async function schedules(date: string) {
  const { start, end } = cinemaDayRange(date);
  return prisma.showtime.findMany({
    where: { branchId, startsAt: { gte: start, lte: end } },
    include: { movie: true, hall: { include: { seats: true } } },
    orderBy: [{ hallId: "asc" }, { startsAt: "asc" }],
  });
}

describe("automatic bookable showtimes", () => {
  it("persists future performances on the selected Myanmar day with real, holdable seats", async () => {
    const date = cinemaDate(1);
    await ensureAutomaticShowtimes(date, branchId);
    const rows = await schedules(date);
    for (const movieId of movieIds) expect(rows.some((row) => row.movieId === movieId)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(movieIds.length);
    for (const row of rows) {
      expect(cinemaDate(0, row.startsAt)).toBe(date);
      expect(row.startsAt.getTime()).toBeGreaterThan(Date.now());
      expect(row.endsAt.getTime() - row.startsAt.getTime()).toBeGreaterThanOrEqual((row.movie.runtimeMin + 20) * 60_000);
      expect(row.priceStandard).toBeGreaterThan(0);
      expect(row.priceCouple).toBeGreaterThan(0);
      expect(row.hall.branchId).toBe(branchId);
    }
    for (const hallId of hallIds) {
      const hallRows = rows.filter((row) => row.hallId === hallId);
      for (let i = 1; i < hallRows.length; i++) {
        expect(hallRows[i].startsAt.getTime()).toBeGreaterThanOrEqual(hallRows[i - 1].endsAt.getTime());
      }
    }
    const generated = rows.find((row) => movieIds.includes(row.movieId))!;
    const seat = generated.hall.seats.find((candidate) => !candidate.isDisabled)!;
    expect((await acquireSeatHold(generated.id, seat.id, userId)).ok).toBe(true);
    expect(await prisma.seatHold.findUnique({ where: { showtimeId_seatId: { showtimeId: generated.id, seatId: seat.id } } })).not.toBeNull();
  });

  it("creates a schedule only once when repeated and concurrent requests race", async () => {
    const date = cinemaDate(1);
    await Promise.all(Array.from({ length: 8 }, () => ensureAutomaticShowtimes(date, branchId)));
    const first = await schedules(date);
    expect(first.length).toBeGreaterThanOrEqual(movieIds.length);
    await Promise.all(Array.from({ length: 8 }, () => ensureAutomaticShowtimes(date, branchId)));
    await ensureAutomaticShowtimes(date, branchId);
    expect((await schedules(date)).map((row) => row.id)).toEqual(first.map((row) => row.id));
    const slots = first.map((row) => `${row.hallId}:${row.startsAt.toISOString()}`);
    expect(new Set(slots).size).toBe(slots.length);
  });

  it("keeps generating subsequent dates without replacing earlier booked performances", async () => {
    const date = cinemaDate(1);
    const manual = await prisma.showtime.create({
      data: {
        movieId: movieIds[0], branchId, hallId: hallIds[0],
        startsAt: new Date(`${date}T12:00:00+06:30`), endsAt: new Date(`${date}T13:40:00+06:30`),
        priceStandard: 6500, priceCouple: 12500,
      },
    });
    const seats = await prisma.seat.findMany({ where: { hallId: hallIds[0] }, orderBy: { column: "asc" } });
    const booking = await prisma.booking.create({
      data: {
        reference: `${prefix}-paid`, userId, showtimeId: manual.id, status: "PAID", subtotal: 6500, total: 6500,
        contactEmail: `${prefix}@example.test`, seats: { create: { seatId: seats[0].id, price: 6500 } },
      },
    });
    const hold = await prisma.seatHold.create({
      data: { showtimeId: manual.id, seatId: seats[1].id, sessionId: userId, expiresAt: new Date(Date.now() + 600_000) },
    });
    await ensureAutomaticShowtimes(date, branchId);
    const earlier = await schedules(date);
    await ensureAutomaticShowtimes(cinemaDate(2), branchId);
    expect(await prisma.showtime.findUnique({ where: { id: manual.id } })).toEqual(manual);
    expect(await prisma.booking.findUnique({ where: { id: booking.id } })).toEqual(booking);
    expect(await prisma.seatHold.findUnique({ where: { id: hold.id } })).toEqual(hold);
    expect((await schedules(date)).map((row) => row.id)).toEqual(earlier.map((row) => row.id));
    const tomorrow = await schedules(cinemaDate(2));
    for (const movieId of movieIds) expect(tomorrow.some((row) => row.movieId === movieId)).toBe(true);
    for (const row of earlier.filter((candidate) => candidate.hallId === manual.hallId && candidate.id !== manual.id)) {
      expect(row.endsAt <= manual.startsAt || row.startsAt >= manual.endsAt).toBe(true);
    }
  });

  it("waits for an in-progress administrator schedule before filling the remaining slots", async () => {
    const date = cinemaDate(1);
    const startsAt = new Date(`${date}T12:00:00+06:30`);
    const endsAt = new Date(`${date}T13:40:00+06:30`);
    let releaseManual!: () => void;
    let announceLock!: () => void;
    const gate = new Promise<void>((resolve) => { releaseManual = resolve; });
    const manualLocked = new Promise<void>((resolve) => { announceLock = resolve; });
    const manual = prisma.$transaction(async (tx) => {
      await lockShowtimeInterval(tx, branchId, startsAt, endsAt);
      announceLock();
      await gate;
      return tx.showtime.create({
        data: { movieId: movieIds[0], branchId, hallId: hallIds[0], startsAt, endsAt, priceStandard: 7500, priceCouple: 15000 },
      });
    }, { timeout: 15_000 });
    await manualLocked;
    const generation = ensureAutomaticShowtimes(date, branchId);
    try {
      let waiting = false;
      const key = `automatic-showtimes:${branchId}:${date}`;
      for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
        const rows = await prisma.$queryRaw<{ waiting: boolean }[]>`
          SELECT EXISTS (
            SELECT 1 FROM pg_locks
            WHERE locktype = 'advisory' AND NOT granted AND objid = hashtext(${key})::oid
          ) AS waiting`;
        waiting = rows[0].waiting;
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
    } finally {
      releaseManual();
    }
    const [manualShowtime] = await Promise.all([manual, generation]);
    const rows = await schedules(date);
    expect(rows.some((row) => row.id === manualShowtime.id)).toBe(true);
    for (const row of rows.filter((row) => row.hallId === hallIds[0] && row.id !== manualShowtime.id)) {
      expect(row.endsAt <= startsAt || row.startsAt >= endsAt).toBe(true);
    }
  });

  it("waits for a simultaneous manual performance crossing Myanmar midnight, then avoids it", async () => {
    const previousDate = cinemaDate(1);
    const date = cinemaDate(2);
    const startsAt = new Date(`${previousDate}T23:30:00+06:30`);
    const endsAt = new Date(`${date}T01:30:00+06:30`);
    let releaseManual!: () => void;
    let reportLocked!: () => void;
    const canCommit = new Promise<void>((resolve) => { releaseManual = resolve; });
    const lockAcquired = new Promise<void>((resolve) => { reportLocked = resolve; });
    const manualWrite = prisma.$transaction(async (tx) => {
      await lockShowtimeInterval(tx, branchId, startsAt, endsAt);
      reportLocked();
      await canCommit;
      expect(await hasOverlap(hallIds[0], startsAt, endsAt, undefined, tx)).toBe(false);
      return tx.showtime.create({
        data: { movieId: movieIds[0], branchId, hallId: hallIds[0], startsAt, endsAt, priceStandard: 6500, priceCouple: 12500 },
      });
    }, { timeout: 10_000 });
    await Promise.race([lockAcquired, manualWrite]);
    const automaticWrite = ensureAutomaticShowtimes(date, branchId);
    let waitedForManual = false;
    try {
      const deadline = Date.now() + 2000;
      while (Date.now() < deadline) {
        const [state] = await prisma.$queryRaw<{ waiting: boolean }[]>`
          SELECT EXISTS (
            SELECT 1 FROM pg_stat_activity
            WHERE datname = current_database() AND wait_event_type = 'Lock' AND wait_event = 'advisory'
          ) AS waiting
        `;
        if (state.waiting) {
          waitedForManual = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    } finally {
      releaseManual();
    }
    const [manual] = await Promise.all([manualWrite, automaticWrite]);
    expect(waitedForManual).toBe(true);
    expect(await prisma.showtime.findUnique({ where: { id: manual.id } })).toEqual(manual);
    for (const row of (await schedules(date)).filter((candidate) => candidate.hallId === manual.hallId)) {
      expect(row.startsAt >= manual.endsAt).toBe(true);
    }
  });

  it("respects the administrator's disabled automatic-schedule setting", async () => {
    await setAutomaticShowtimes(false);
    await ensureAutomaticShowtimes(cinemaDate(1), branchId);
    expect(await prisma.showtime.count({ where: { branchId } })).toBe(0);
  });

  it("honors movie release/status and branch restrictions", async () => {
    await ensureAutomaticShowtimes(cinemaDate(1), branchId);
    const rows = await schedules(cinemaDate(1));
    expect(rows.some((row) => row.movieId === releasedComingSoonId)).toBe(true);
    for (const movieId of excludedMovieIds) expect(rows.some((row) => row.movieId === movieId)).toBe(false);
  });

  it.each(["inactive branch", "disabled seats"])("does not offer performances for an unusable cinema: %s", async (reason) => {
    if (reason === "inactive branch") {
      await prisma.branch.update({ where: { id: branchId }, data: { isActive: false } });
    } else {
      await prisma.seat.updateMany({ where: { hallId: { in: hallIds } }, data: { isDisabled: true } });
    }
    await ensureAutomaticShowtimes(cinemaDate(1), branchId);
    expect(await prisma.showtime.count({ where: { branchId } })).toBe(0);
  });

  it("ignores invalid, past and beyond-the-visible-week dates without creating records", async () => {
    for (const date of ["not-a-date", "2026-2-03", "2026-02-30", cinemaDate(-1), cinemaDate(7)]) {
      await ensureAutomaticShowtimes(date, branchId);
    }
    expect(await prisma.showtime.count({ where: { branchId } })).toBe(0);
  });
});
