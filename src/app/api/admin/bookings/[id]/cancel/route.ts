import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const before = await prisma.booking.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before.status !== "PENDING" && before.status !== "PAID") {
    return NextResponse.json({ error: "Only pending or paid bookings can be cancelled." }, { status: 400 });
  }

  const booking = await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
  await recordAudit({ actorId: user.id, action: "booking.cancel", entityType: "Booking", entityId: id, before, after: booking });

  return NextResponse.json({ booking });
}
