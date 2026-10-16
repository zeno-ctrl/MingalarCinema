import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/auth-helpers";
import { formatMMK } from "@/lib/utils";

export const metadata = { title: "My Tickets - Mingalar Cinema" };

type BookingWithDetails = Prisma.BookingGetPayload<{
  include: { showtime: { include: { movie: true; branch: true; hall: true } }; seats: true };
}>;

export default async function MyTicketsPage() {
  const user = await requirePageUser("/my-tickets");
  const bookings = await prisma.booking.findMany({
    where: { userId: user.id, status: { in: ["PENDING", "PAID", "CHECKED_IN"] } },
    include: { showtime: { include: { movie: true, branch: true, hall: true } }, seats: true },
    orderBy: { showtime: { startsAt: "desc" } },
  });

  const now = new Date();
  const upcoming = bookings.filter((b) => b.showtime.startsAt >= now);
  const past = bookings.filter((b) => b.showtime.startsAt < now);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">My Tickets</h1>

      <TicketSection title="Upcoming" bookings={upcoming} emptyText="No upcoming bookings yet." />
      {upcoming.length === 0 && (
        <Link href="/movies" className="mt-4 inline-flex min-h-11 items-center rounded-chip bg-brand-gradient px-5 py-2 text-sm font-medium text-white">
          Find a movie
        </Link>
      )}
      <div className="mt-8">
        <TicketSection title="Past" bookings={past} emptyText="No past bookings." />
      </div>
    </div>
  );
}

function TicketSection({
  title,
  bookings,
  emptyText,
}: {
  title: string;
  bookings: BookingWithDetails[];
  emptyText: string;
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-text-muted">{title}</h2>
      {bookings.length === 0 ? (
        <p className="text-sm text-text-muted">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/my-tickets/${b.reference}`}
              className="block rounded-card bg-bg-soft p-4 shadow-card transition-shadow hover:shadow-card-hover"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="min-w-0 break-words font-medium">{b.showtime.movie.title}</h3>
                <span className="rounded bg-bg px-2 py-1 text-xs font-medium text-text-muted">
                  {b.status === "PENDING" ? "Payment pending" : b.status === "PAID" ? "Confirmed" : "Checked in"}
                </span>
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {b.showtime.branch.nameEn} • {b.showtime.hall.name}
              </p>
              <p className="text-sm text-text-muted">
                {b.showtime.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Yangon" })}
              </p>
              <p className="mt-1 text-sm">
                {b.seats.length} seat{b.seats.length !== 1 ? "s" : ""} • {formatMMK(b.total)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

