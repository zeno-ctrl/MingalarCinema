import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";

const schema = z.object({ qrToken: z.string().min(1) });

export async function POST(req: Request) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { qrToken: parsed.data.qrToken },
    include: { showtime: { include: { movie: true, branch: true } }, seats: { include: { seat: true } } },
  });

  if (!booking) {
    return NextResponse.json({ ok: false, warning: "INVALID", message: "This ticket QR code isn't recognized." });
  }
  if (booking.status === "CHECKED_IN") {
    return NextResponse.json({
      ok: false,
      warning: "ALREADY_USED",
      message: "This ticket has already been checked in.",
      booking: summarize(booking),
    });
  }
  if (booking.status !== "PAID") {
    return NextResponse.json({
      ok: false,
      warning: "NOT_PAID",
      message: `This booking's status is ${booking.status}, not paid.`,
      booking: summarize(booking),
    });
  }

  const updated = await prisma.booking.update({ where: { id: booking.id }, data: { status: "CHECKED_IN", checkedInAt: new Date() } });
  await recordAudit({ actorId: user.id, action: "booking.check_in", entityType: "Booking", entityId: booking.id, before: booking, after: updated });

  return NextResponse.json({ ok: true, booking: summarize(booking) });
}

function summarize(booking: {
  reference: string;
  showtime: { movie: { titleEn: string }; branch: { nameEn: string }; startsAt: Date };
  seats: { seat: { label: string } }[];
}) {
  return {
    reference: booking.reference,
    movieTitle: booking.showtime.movie.titleEn,
    branchName: booking.showtime.branch.nameEn,
    startsAt: booking.showtime.startsAt,
    seats: booking.seats.map((s) => s.seat.label),
  };
}
