import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCashierPage, hasRole } from "@/lib/auth-helpers";
import { getTicketQrDataUrl } from "@/lib/ticket";
import { formatMMK } from "@/lib/utils";

export default async function CashierReceiptPage({ params }: { params: Promise<{ reference: string }> }) {
  const user = await requireCashierPage();
  const { reference } = await params;

  const booking = await prisma.booking.findUnique({
    where: { reference },
    include: {
      showtime: { include: { movie: true, branch: true, hall: true } },
      seats: { include: { seat: true }, orderBy: { seat: { label: "asc" } } },
    },
  });

  if (!booking || (booking.userId !== user.id && !hasRole(user.role, "ADMIN"))) notFound();

  const qrDataUrl = await getTicketQrDataUrl(booking);

  return (
    <div className="px-4 py-6">
      <div className="overflow-hidden rounded-card bg-bg shadow-card">
        <div className="bg-brand-gradient p-4 text-white">
          <p className="text-xs uppercase tracking-wide opacity-80">Paid (cash)</p>
          <h1 className="text-lg font-semibold">{booking.showtime.movie.titleEn}</h1>
        </div>
        <div className="space-y-3 p-4">
          <div className="text-sm">
            <p className="text-text-muted">
              {booking.showtime.branch.nameEn} • {booking.showtime.hall.name}
            </p>
            <p>{booking.showtime.startsAt.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}</p>
          </div>
          <div className="text-sm">
            <p className="text-text-muted">Seats</p>
            <p>{booking.seats.map((s) => s.seat.label).join(", ")}</p>
          </div>
          <div className="text-sm">
            <p className="text-text-muted">Customer</p>
            <p>
              {booking.guestName || "-"} {booking.contactPhone && `• ${booking.contactPhone}`}
            </p>
          </div>
          <div className="text-sm">
            <p className="text-text-muted">Amount collected</p>
            <p className="text-lg font-semibold">{formatMMK(booking.total)}</p>
          </div>
          <div className="text-sm">
            <p className="text-text-muted">Booking Reference</p>
            <p className="font-mono font-semibold">{booking.reference}</p>
          </div>

          <div className="pt-2 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Ticket QR code" className="mx-auto h-48 w-48" />
            <p className="mt-2 text-xs text-text-muted">Hand this ticket to the customer</p>
            <a
              href={`/api/tickets/${booking.reference}/pdf`}
              className="mt-4 inline-block rounded-chip bg-brand-gradient px-6 py-3 text-sm font-semibold text-white"
            >
              Print Ticket (PDF)
            </a>
          </div>
        </div>
      </div>

      <Link
        href="/cashier"
        className="mt-6 block w-full rounded-chip bg-bg-soft px-6 py-3 text-center text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10"
      >
        Sell another ticket
      </Link>
    </div>
  );
}
