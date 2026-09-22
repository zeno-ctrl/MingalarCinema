import { prisma } from "@/lib/db";

const ACTIVE_BOOKING_STATUSES = ["PENDING", "PAID", "CHECKED_IN"] as const;

export async function getShowtimeAvailability(showtimeId: string, hallId: string) {
  const [totalSeats, bookedSeats, activeHolds] = await Promise.all([
    prisma.seat.count({ where: { hallId, isDisabled: false } }),
    prisma.bookingSeat.count({
      where: { booking: { showtimeId, status: { in: [...ACTIVE_BOOKING_STATUSES] } } },
    }),
    prisma.seatHold.count({ where: { showtimeId, expiresAt: { gt: new Date() } } }),
  ]);
  const taken = bookedSeats + activeHolds;
  return { totalSeats, taken, remaining: Math.max(0, totalSeats - taken) };
}

export async function annotateAvailability<T extends { id: string; hallId: string }>(
  showtimes: T[],
): Promise<(T & { remaining: number; totalSeats: number })[]> {
  return Promise.all(
    showtimes.map(async (s) => {
      const { remaining, totalSeats } = await getShowtimeAvailability(s.id, s.hallId);
      return { ...s, remaining, totalSeats };
    }),
  );
}
