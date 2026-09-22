import { randomUUID } from "node:crypto";
import { Prisma, type BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SEAT_HOLD_DURATION_MS, MAX_SEATS_PER_BOOKING } from "@/lib/constants";

// A PENDING booking only blocks a seat until its payment window
// (Booking.expiresAt) lapses; PAID/CHECKED_IN always block.
const ACTIVE_BOOKING_WHERE = Prisma.sql`(b.status IN ('PAID', 'CHECKED_IN') OR (b.status = 'PENDING' AND (b."expiresAt" IS NULL OR b."expiresAt" > now())))`;

/** Prisma query-builder equivalent of ACTIVE_BOOKING_WHERE, for callers not using raw SQL. */
export function activeBookingOr(): Prisma.BookingWhereInput[] {
  const statuses: BookingStatus[] = ["PAID", "CHECKED_IN"];
  return [
    { status: { in: statuses } },
    { status: "PENDING", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  ];
}

export type HoldResult =
  | { ok: true; expiresAt: Date }
  | { ok: false; reason: "TAKEN" | "MAX_SEATS" | "NOT_FOUND" };

/**
 * Atomically claims a seat for `sessionId` (the user id) if, and only if, no
 * other active booking already holds that seat for this showtime and no one
 * else currently holds an unexpired lock on it. This is a single SQL
 * statement (INSERT ... ON CONFLICT) so Postgres serializes concurrent
 * attempts at the row level via the (showtimeId, seatId) unique index —
 * two simultaneous requests for the same seat cannot both succeed, which is
 * what actually prevents double-booking (the app-level pre-checks alone
 * could not, under a race).
 */
export async function acquireSeatHold(showtimeId: string, seatId: string, sessionId: string): Promise<HoldResult> {
  const seat = await prisma.seat.findUnique({ where: { id: seatId } });
  if (!seat || seat.hallId == null || seat.isDisabled) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const currentHoldCount = await prisma.seatHold.count({
    where: { showtimeId, sessionId, expiresAt: { gt: new Date() } },
  });
  if (currentHoldCount >= MAX_SEATS_PER_BOOKING) {
    return { ok: false, reason: "MAX_SEATS" };
  }

  const id = randomUUID();
  const expiresAt = new Date(Date.now() + SEAT_HOLD_DURATION_MS);

  const rows = await prisma.$queryRaw<{ id: string; expiresAt: Date }[]>`
    INSERT INTO "SeatHold" (id, "showtimeId", "seatId", "sessionId", "expiresAt", "createdAt")
    SELECT ${id}, ${showtimeId}, ${seatId}, ${sessionId}, ${expiresAt}, now()
    WHERE NOT EXISTS (
      SELECT 1 FROM "BookingSeat" bs
      JOIN "Booking" b ON b.id = bs."bookingId"
      WHERE bs."seatId" = ${seatId}
        AND b."showtimeId" = ${showtimeId}
        AND ${ACTIVE_BOOKING_WHERE}
    )
    ON CONFLICT ("showtimeId", "seatId")
    DO UPDATE SET "sessionId" = EXCLUDED."sessionId", "expiresAt" = EXCLUDED."expiresAt"
    WHERE "SeatHold"."expiresAt" < now() OR "SeatHold"."sessionId" = ${sessionId}
    RETURNING id, "expiresAt"
  `;

  if (rows.length === 0) {
    return { ok: false, reason: "TAKEN" };
  }
  return { ok: true, expiresAt: rows[0].expiresAt };
}

export async function releaseSeatHold(showtimeId: string, seatId: string, sessionId: string): Promise<void> {
  await prisma.seatHold.deleteMany({ where: { showtimeId, seatId, sessionId } });
}

export async function releaseAllHoldsForSession(showtimeId: string, sessionId: string): Promise<void> {
  await prisma.seatHold.deleteMany({ where: { showtimeId, sessionId } });
}

export type SeatStatus = "AVAILABLE" | "TAKEN" | "HELD_BY_ME" | "HELD_BY_OTHER";

export async function getShowtimeSeatStatuses(showtimeId: string, sessionId: string) {
  // Opportunistic cleanup so expired holds don't linger indefinitely in the
  // table (correctness doesn't depend on this — acquireSeatHold already
  // treats expired rows as available — this just keeps it tidy).
  await prisma.seatHold.deleteMany({ where: { showtimeId, expiresAt: { lt: new Date() } } });

  const [bookedSeatIds, holds] = await Promise.all([
    prisma.bookingSeat.findMany({
      where: { booking: { showtimeId, OR: activeBookingOr() } },
      select: { seatId: true },
    }),
    prisma.seatHold.findMany({ where: { showtimeId, expiresAt: { gt: new Date() } } }),
  ]);

  const takenSet = new Set(bookedSeatIds.map((b) => b.seatId));
  const statuses = new Map<string, SeatStatus>();
  for (const seatId of takenSet) statuses.set(seatId, "TAKEN");
  for (const hold of holds) {
    if (!takenSet.has(hold.seatId)) {
      statuses.set(hold.seatId, hold.sessionId === sessionId ? "HELD_BY_ME" : "HELD_BY_OTHER");
    }
  }

  const myHolds = holds.filter((h) => h.sessionId === sessionId);
  const myHoldExpiresAt = myHolds.length > 0 ? myHolds.reduce((min, h) => (h.expiresAt < min ? h.expiresAt : min), myHolds[0].expiresAt) : null;

  return { statuses, myHoldExpiresAt, mySeatIds: myHolds.map((h) => h.seatId) };
}
