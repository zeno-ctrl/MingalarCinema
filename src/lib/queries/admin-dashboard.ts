import { prisma } from "@/lib/db";

const PAID_STATUSES = ["PAID", "CHECKED_IN"] as const;

function startOfDay(d = new Date()) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function getDashboardSummary() {
  const today = startOfDay();
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [todayBookings, last30Bookings] = await Promise.all([
    prisma.booking.findMany({
      where: { status: { in: [...PAID_STATUSES] }, createdAt: { gte: today } },
      include: { seats: true },
    }),
    prisma.booking.findMany({
      where: { status: { in: [...PAID_STATUSES] }, createdAt: { gte: last30 } },
      include: {
        seats: true,
        showtime: { include: { movie: true, branch: true } },
      },
    }),
  ]);

  const todaySales = todayBookings.reduce((sum, b) => sum + b.total, 0);
  const todayTickets = todayBookings.reduce((sum, b) => sum + b.seats.length, 0);

  const revenueByBranch = new Map<string, { name: string; revenue: number }>();
  const revenueByMovie = new Map<string, { name: string; revenue: number }>();
  const revenueByDay = new Map<string, number>();

  for (const b of last30Bookings) {
    const branchKey = b.showtime.branch.id;
    const branchEntry = revenueByBranch.get(branchKey) ?? { name: b.showtime.branch.nameEn, revenue: 0 };
    branchEntry.revenue += b.total;
    revenueByBranch.set(branchKey, branchEntry);

    const movieKey = b.showtime.movie.id;
    const movieEntry = revenueByMovie.get(movieKey) ?? { name: b.showtime.movie.title, revenue: 0 };
    movieEntry.revenue += b.total;
    revenueByMovie.set(movieKey, movieEntry);

    const dayKey = b.createdAt.toISOString().slice(0, 10);
    revenueByDay.set(dayKey, (revenueByDay.get(dayKey) ?? 0) + b.total);
  }

  const dailySeries = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return { date: key, revenue: revenueByDay.get(key) ?? 0 };
  });

  const upcomingShowtimes = await prisma.showtime.findMany({
    where: { startsAt: { gte: new Date(), lte: new Date(Date.now() + 24 * 60 * 60 * 1000) } },
    include: { movie: true, branch: true, hall: { include: { seats: true } } },
    orderBy: { startsAt: "asc" },
    take: 10,
  });

  const occupancy = await Promise.all(
    upcomingShowtimes.map(async (s) => {
      const totalSeats = s.hall.seats.filter((seat) => !seat.isDisabled).length;
      const bookedCount = await prisma.bookingSeat.count({
        where: { booking: { showtimeId: s.id, status: { in: [...PAID_STATUSES] } } },
      });
      return {
        id: s.id,
        movieTitle: s.movie.title,
        branchName: s.branch.nameEn,
        startsAt: s.startsAt,
        totalSeats,
        bookedCount,
        occupancyPct: totalSeats > 0 ? Math.round((bookedCount / totalSeats) * 100) : 0,
      };
    }),
  );

  return {
    todaySales,
    todayTickets,
    revenueByBranch: Array.from(revenueByBranch.values()).sort((a, b) => b.revenue - a.revenue),
    revenueByMovie: Array.from(revenueByMovie.values()).sort((a, b) => b.revenue - a.revenue),
    dailySeries,
    occupancy,
  };
}
