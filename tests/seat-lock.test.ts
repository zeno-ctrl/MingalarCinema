import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { acquireSeatHold } from "@/lib/seat-lock";

/**
 * These tests exercise the real Postgres database (no mocking) because the
 * property under test — that two concurrent requests for the same seat can
 * never both succeed — is exactly the kind of race condition that an
 * in-memory mock would hide. Requires DATABASE_URL to point at a reachable
 * Postgres instance with the schema migrated (see README "Running tests").
 */

let showtimeId: string;
let hallId: string;

beforeAll(async () => {
  const showtime = await prisma.showtime.findFirst({
    orderBy: { startsAt: "asc" },
    where: { startsAt: { gt: new Date() } },
  });
  if (!showtime) {
    throw new Error("Seed data required: run `npm run db:seed` before running tests.");
  }
  showtimeId = showtime.id;
  hallId = showtime.hallId;
});

afterEach(async () => {
  // Keep the (shared) dev database clean of test-created holds/bookings.
  await prisma.seatHold.deleteMany({ where: { showtimeId } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function freshSeat(skip = 0) {
  const seat = await prisma.seat.findFirstOrThrow({ where: { hallId, isDisabled: false }, skip });
  await prisma.seatHold.deleteMany({ where: { showtimeId, seatId: seat.id } });
  await prisma.bookingSeat.deleteMany({ where: { seatId: seat.id, booking: { showtimeId } } });
  return seat;
}

describe("seat locking / double-booking prevention", () => {
  it("allows exactly one winner when 20 requests race for the same seat", async () => {
    const seat = await freshSeat(0);

    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => acquireSeatHold(showtimeId, seat.id, `race-user-${i}`)),
    );

    const successes = results.filter((r) => r.ok);
    expect(successes).toHaveLength(1);

    const holds = await prisma.seatHold.findMany({ where: { showtimeId, seatId: seat.id } });
    expect(holds).toHaveLength(1);
  });

  it("lets a new user reclaim an expired hold", async () => {
    const seat = await freshSeat(1);
    await prisma.seatHold.create({
      data: { showtimeId, seatId: seat.id, sessionId: "old-user", expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await acquireSeatHold(showtimeId, seat.id, "new-user");
    expect(result.ok).toBe(true);
  });

  it("blocks a request when the seat has a live hold owned by someone else", async () => {
    const seat = await freshSeat(2);
    const first = await acquireSeatHold(showtimeId, seat.id, "owner");
    expect(first.ok).toBe(true);

    const second = await acquireSeatHold(showtimeId, seat.id, "someone-else");
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("TAKEN");
  });

  it("lets the same owner renew their own hold", async () => {
    const seat = await freshSeat(3);
    const first = await acquireSeatHold(showtimeId, seat.id, "owner");
    expect(first.ok).toBe(true);

    const renewed = await acquireSeatHold(showtimeId, seat.id, "owner");
    expect(renewed.ok).toBe(true);
  });

  it("never allows a hold on a seat that already belongs to a PAID booking", async () => {
    const seat = await freshSeat(4);
    const user = await prisma.user.findFirstOrThrow();
    const booking = await prisma.booking.create({
      data: {
        reference: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: user.id,
        showtimeId,
        status: "PAID",
        subtotal: 6000,
        total: 6000,
        contactEmail: user.email,
        seats: { create: [{ seatId: seat.id, price: 6000 }] },
      },
    });

    const result = await acquireSeatHold(showtimeId, seat.id, "attacker");
    expect(result.ok).toBe(false);

    await prisma.booking.delete({ where: { id: booking.id } });
  });
});
