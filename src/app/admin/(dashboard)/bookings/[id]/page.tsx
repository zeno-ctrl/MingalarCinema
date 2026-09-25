import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatMMK } from "@/lib/utils";
import { BookingActions } from "@/components/admin/bookings/BookingActions";

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      showtime: { include: { movie: true, branch: true, hall: true } },
      seats: { include: { seat: true } },
      user: true,
      payments: true,
    },
  });
  if (!booking) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">{booking.reference}</h1>
      <p className="mb-6 text-sm text-text-muted">Status: {booking.status}</p>

      <div className="rounded-card bg-bg p-4 shadow-card">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Movie" value={booking.showtime.movie.title} />
          <Field label="Branch / Hall" value={`${booking.showtime.branch.nameEn} / ${booking.showtime.hall.name}`} />
          <Field label="Showtime" value={booking.showtime.startsAt.toLocaleString()} />
          <Field label="Seats" value={booking.seats.map((s) => s.seat.label).join(", ")} />
          <Field label="Customer" value={`${booking.user.name} (${booking.user.email})`} />
          <Field label="Contact" value={`${booking.contactEmail}${booking.contactPhone ? ` / ${booking.contactPhone}` : ""}`} />
          <Field label="Subtotal" value={formatMMK(booking.subtotal)} />
          <Field label="Discount" value={formatMMK(booking.discount)} />
          <Field label="Total" value={formatMMK(booking.total)} />
          <Field label="Booked At" value={booking.createdAt.toLocaleString()} />
        </dl>

        {booking.payments.length > 0 && (
          <div className="mt-4 border-t border-black/10 pt-4 dark:border-white/10">
            <h2 className="mb-2 text-sm font-semibold text-text-muted">Payments</h2>
            {booking.payments.map((p) => (
              <p key={p.id} className="text-sm">
                {p.provider} • {p.status} • {formatMMK(p.amount)}
              </p>
            ))}
          </div>
        )}

        <div className="mt-6">
          <BookingActions bookingId={booking.id} status={booking.status} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
