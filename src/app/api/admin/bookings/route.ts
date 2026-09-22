import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  const { response } = await requireApiRole("ADMIN");
  if (response) return response;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();

  const bookings = await prisma.booking.findMany({
    where: q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { contactEmail: { contains: q, mode: "insensitive" } },
            { contactPhone: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { showtime: { include: { movie: true, branch: true } }, seats: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ bookings });
}
