import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/auth-helpers";
import { BookingProgressBar } from "@/components/booking/BookingProgressBar";
import { PayForm } from "@/components/booking/PayForm";
import { formatMMK } from "@/lib/utils";

export const metadata = { title: "Payment - Mingalar Cinema" };

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ showtimeId?: string }>;
}) {
  const { showtimeId } = await searchParams;
  if (!showtimeId) notFound();

  const user = await requirePageUser(`/checkout/pay?showtimeId=${showtimeId}`);

  const showtime = await prisma.showtime.findUnique({
    where: { id: showtimeId },
    include: { movie: true, branch: true, hall: true },
  });
  if (!showtime) notFound();

  const holds = await prisma.seatHold.findMany({
    where: { showtimeId, sessionId: user.id, expiresAt: { gt: new Date() } },
    include: { seat: true },
    orderBy: { seat: { label: "asc" } },
  });

  if (holds.length === 0) {
    redirect(`/checkout/seats?showtimeId=${showtimeId}`);
  }

  const priceByType: Record<string, number> = {
    STANDARD: showtime.priceStandard,
    VIP: showtime.priceVip,
    COUPLE: showtime.priceCouple,
  };
  const subtotal = holds.reduce((sum, h) => sum + priceByType[h.seat.type], 0);

  return (
    <div>
      <BookingProgressBar current={4} />

      <div className="px-4 pb-4">
        <h1 className="text-lg font-semibold">{showtime.movie.titleEn}</h1>
        <p className="text-sm text-text-muted">
          {showtime.branch.nameEn} • {showtime.hall.name} •{" "}
          {showtime.startsAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
        </p>

        <div className="mt-4 rounded-card bg-bg-soft p-4">
          <h2 className="mb-2 text-sm font-semibold text-text-muted">Order Summary</h2>
          <ul className="space-y-1 text-sm">
            {holds.map((h) => (
              <li key={h.id} className="flex justify-between">
                <span>
                  Seat {h.seat.label} ({h.seat.type})
                </span>
                <span>{formatMMK(priceByType[h.seat.type])}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-black/10 pt-2 text-sm font-semibold dark:border-white/10">
            <span>Subtotal</span>
            <span>{formatMMK(subtotal)}</span>
          </div>
        </div>

        <PayForm showtimeId={showtimeId} subtotal={subtotal} />
      </div>
    </div>
  );
}
