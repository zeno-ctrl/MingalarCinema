import { notFound, redirect } from "next/navigation";
import { getShowtimeById } from "@/lib/queries/showtimes";
import { getShowtimeSeatStatuses } from "@/lib/seat-lock";
import { requireCashierPage } from "@/lib/auth-helpers";
import { CashierPayForm } from "@/components/cashier/CashierPayForm";

export default async function CashierPayPage({
  searchParams,
}: {
  searchParams: Promise<{ showtimeId?: string }>;
}) {
  const { showtimeId } = await searchParams;
  if (!showtimeId) notFound();

  const user = await requireCashierPage();

  const showtime = await getShowtimeById(showtimeId);
  if (!showtime) notFound();

  const { mySeatIds } = await getShowtimeSeatStatuses(showtimeId, user.id);
  if (mySeatIds.length === 0) {
    redirect(`/cashier/seats?showtimeId=${showtimeId}`);
  }

  const priceByType: Record<string, number> = {
    STANDARD: showtime.priceStandard,
    VIP: showtime.priceVip,
    COUPLE: showtime.priceCouple,
  };
  const mySeats = showtime.hall.seats.filter((s) => mySeatIds.includes(s.id));
  const total = mySeats.reduce((sum, s) => sum + priceByType[s.type], 0);

  return (
    <div>
      <div className="px-4 pb-2 pt-4">
        <h1 className="text-lg font-semibold">{showtime.movie.titleEn}</h1>
        <p className="text-sm text-text-muted">
          {showtime.branch.nameEn} • {showtime.hall.name} •{" "}
          {showtime.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      <CashierPayForm showtimeId={showtimeId} total={total} seatLabels={mySeats.map((s) => s.label)} />
    </div>
  );
}
