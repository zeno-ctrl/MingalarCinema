import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth-helpers";
import { expireStaleBookings } from "@/lib/booking";

export async function GET(req: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const url = new URL(req.url);
  const bookingId = url.searchParams.get("bookingId");
  if (!bookingId) return NextResponse.json({ error: "bookingId is required" }, { status: 400 });

  await expireStaleBookings();

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ status: booking.status, reference: booking.reference });
}
