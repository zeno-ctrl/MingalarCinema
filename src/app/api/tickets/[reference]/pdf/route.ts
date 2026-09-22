import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";
import { generateTicketPdf } from "@/lib/ticket";

export async function GET(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { reference } = await params;
  const booking = await prisma.booking.findUnique({
    where: { reference },
    include: {
      showtime: { include: { movie: true, branch: true, hall: true } },
      seats: { include: { seat: true }, orderBy: { seat: { label: "asc" } } },
    },
  });

  if (!booking || (booking.userId !== user.id && user.role === "USER")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (booking.status !== "PAID" && booking.status !== "CHECKED_IN") {
    return NextResponse.json({ error: "This ticket isn't ready yet" }, { status: 400 });
  }

  const pdfBytes = await generateTicketPdf(booking);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cinetown-${booking.reference}.pdf"`,
    },
  });
}
