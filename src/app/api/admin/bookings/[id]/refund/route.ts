import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";

/**
 * Marks the booking/payment refunded in our own records. A production
 * deployment should also call the provider's refund API here (e.g.
 * stripe.refunds.create) before updating local state — omitted since the
 * sandbox/mock providers in this build have no real money to refund.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const before = await prisma.booking.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before.status !== "PAID" && before.status !== "CHECKED_IN") {
    return NextResponse.json({ error: "Only paid bookings can be refunded." }, { status: 400 });
  }

  const [booking] = await prisma.$transaction([
    prisma.booking.update({ where: { id }, data: { status: "REFUNDED" } }),
    prisma.payment.updateMany({ where: { bookingId: id, status: "SUCCEEDED" }, data: { status: "REFUNDED" } }),
  ]);

  await recordAudit({ actorId: user.id, action: "booking.refund", entityType: "Booking", entityId: id, before, after: booking });

  return NextResponse.json({ booking });
}
