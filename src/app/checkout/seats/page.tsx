import { notFound } from "next/navigation";
import { getShowtimeById } from "@/lib/queries/showtimes";
import { getShowtimeSeatStatuses } from "@/lib/seat-lock";
import { requirePageUser } from "@/lib/auth-helpers";
import { BookingProgressBar } from "@/components/booking/BookingProgressBar";
import { SeatMap } from "@/components/booking/SeatMap";

export const metadata = { title: "Select Seats - CineTown" };

export default async function SeatsPage({
  searchParams,
}: {
  searchParams: Promise<{ showtimeId?: string }>;
}) {
  const { showtimeId } = await searchParams;
  if (!showtimeId) notFound();

  const user = await requirePageUser(`/checkout/seats?showtimeId=${showtimeId}`);

  const showtime = await getShowtimeById(showtimeId);
  if (!showtime) notFound();

  const isPast = showtime.startsAt < new Date();

  const { statuses, myHoldExpiresAt, mySeatIds } = await getShowtimeSeatStatuses(showtimeId, user.id);

  return (
    <div>
      <BookingProgressBar current={3} />

      <div className="px-4 pb-2">
        <h1 className="text-lg font-semibold">{showtime.movie.titleEn}</h1>
        <p className="text-sm text-text-muted">
          {showtime.branch.nameEn} • {showtime.hall.name} •{" "}
          {showtime.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      {isPast ? (
        <p className="px-4 py-8 text-center text-text-muted">This showtime has already passed.</p>
      ) : (
        <SeatMap
          showtimeId={showtimeId}
          seats={showtime.hall.seats}
          initialStatuses={Object.fromEntries(statuses) as Record<string, "AVAILABLE" | "TAKEN" | "HELD_BY_ME" | "HELD_BY_OTHER">}
          initialMySeatIds={mySeatIds}
          initialHoldExpiresAt={myHoldExpiresAt ? myHoldExpiresAt.toISOString() : null}
          prices={{ STANDARD: showtime.priceStandard, VIP: showtime.priceVip, COUPLE: showtime.priceCouple }}
        />
      )}
    </div>
  );
}
