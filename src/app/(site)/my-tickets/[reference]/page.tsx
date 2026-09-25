import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getTicketQrDataUrl } from "@/lib/ticket";
import { formatMMK } from "@/lib/utils";
import { ResumePaymentButtons } from "@/components/booking/ResumePaymentButtons";

export const metadata = { title: "Your Ticket - Mingalar Cinema" };

export default async function TicketDetailPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const booking = await prisma.booking.findUnique({
    where: { reference },
    include: {
      showtime: { include: { movie: true, branch: true, hall: true } },
      seats: { include: { seat: true }, orderBy: { seat: { label: "asc" } } },
    },
  });

  if (!booking || booking.userId !== user.id) notFound();

  const qrDataUrl = booking.status === "PAID" || booking.status === "CHECKED_IN" ? await getTicketQrDataUrl(booking) : null;

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <Link href="/my-tickets" className="mb-4 inline-block text-sm text-text-muted hover:underline">
        &larr; My Tickets
      </Link>

      <div className="overflow-hidden rounded-card bg-bg-soft shadow-card">
        <div className="bg-brand-gradient p-4 text-white">
          <p className="text-xs uppercase tracking-wide opacity-80">{booking.status}</p>
          <h1 className="text-lg font-semibold">{booking.showtime.movie.title}</h1>
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
            <p className="text-text-muted">Amount paid</p>
            <p>{formatMMK(booking.total)}</p>
          </div>
          <div className="text-sm">
            <p className="text-text-muted">Booking Reference</p>
            <p className="font-mono font-semibold">{booking.reference}</p>
          </div>

          {qrDataUrl ? (
            <div className="pt-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Ticket QR code" className="mx-auto h-48 w-48" />
              <p className="mt-2 text-xs text-text-muted">Show this QR code at the cinema</p>
              <a
                href={`/api/tickets/${booking.reference}/pdf`}
                className="mt-4 inline-block rounded-chip bg-brand-gradient px-6 py-3 text-sm font-semibold text-white"
              >
                Download Ticket (PDF)
              </a>
            </div>
          ) : booking.status === "PENDING" && booking.expiresAt && booking.expiresAt > new Date() ? (
            <div className="space-y-3 pt-2">
              <p className="rounded-chip bg-warning/15 px-4 py-2 text-sm text-warning">
                Reserved &mdash; complete payment by{" "}
                {booking.expiresAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} or these
                seats will be released.
              </p>
              <ResumePaymentButtons bookingId={booking.id} />
            </div>
          ) : (
            <p className="pt-2 text-sm text-text-muted">
              {booking.status === "PENDING" ? "This reservation has expired." : "This booking is no longer active."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
