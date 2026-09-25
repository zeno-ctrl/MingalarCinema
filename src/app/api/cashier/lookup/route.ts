import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { formatMMK } from "@/lib/utils";

export async function GET(req: Request) {
  const { response } = await requireApiRole("CASHIER");
  if (response) return response;

  const url = new URL(req.url);
  const reference = url.searchParams.get("reference")?.trim().toUpperCase();
  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { reference },
    include: {
      showtime: { include: { movie: true, branch: true, hall: true } },
      seats: { include: { seat: true }, orderBy: { seat: { label: "asc" } } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "No booking found with that code." }, { status: 404 });
  }

  return NextResponse.json({
    reference: booking.reference,
    status: booking.status,
    expiresAt: booking.expiresAt,
    movieTitle: booking.showtime.movie.titleEn,
    branchName: booking.showtime.branch.nameEn,
    hallName: booking.showtime.hall.name,
    startsAt: booking.showtime.startsAt,
    seats: booking.seats.map((s) => s.seat.label),
    total: booking.total,
    totalFormatted: formatMMK(booking.total),
  });
}
