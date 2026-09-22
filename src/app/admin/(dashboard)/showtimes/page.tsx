import Link from "next/link";
import { prisma } from "@/lib/db";
import { ShowtimesTable } from "@/components/admin/showtimes/ShowtimesTable";

export default async function AdminShowtimesPage() {
  const showtimes = await prisma.showtime.findMany({
    where: { startsAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    include: { movie: true, branch: true, hall: true },
    orderBy: { startsAt: "asc" },
    take: 500,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Showtimes</h1>
        <div className="flex gap-2">
          <Link href="/admin/showtimes/bulk" className="rounded-chip bg-bg-soft px-4 py-2 text-sm font-medium">
            Bulk Create
          </Link>
          <Link href="/admin/showtimes/new" className="rounded-chip bg-brand-gradient px-4 py-2 text-sm font-medium text-white">
            + Add Showtime
          </Link>
        </div>
      </div>
      <ShowtimesTable
        showtimes={showtimes.map((s) => ({
          id: s.id,
          movieTitle: s.movie.titleEn,
          branchName: s.branch.nameEn,
          hallName: s.hall.name,
          startsAt: s.startsAt.toISOString(),
          format: s.format,
        }))}
      />
    </div>
  );
}
