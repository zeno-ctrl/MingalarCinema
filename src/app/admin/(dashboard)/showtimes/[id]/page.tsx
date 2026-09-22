import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ShowtimeForm } from "@/components/admin/showtimes/ShowtimeForm";

export default async function EditShowtimePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [showtime, movies, branches, halls] = await Promise.all([
    prisma.showtime.findUnique({ where: { id } }),
    prisma.movie.findMany({ include: { branches: true }, orderBy: { titleEn: "asc" } }),
    prisma.branch.findMany({ orderBy: { nameEn: "asc" } }),
    prisma.hall.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!showtime) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Edit Showtime</h1>
      <ShowtimeForm
        showtimeId={showtime.id}
        movies={movies.map((m) => ({ id: m.id, titleEn: m.titleEn, allBranches: m.allBranches, branchIds: m.branches.map((b) => b.branchId) }))}
        branches={branches}
        halls={halls.map((h) => ({ id: h.id, name: h.name, branchId: h.branchId }))}
        initial={{
          movieId: showtime.movieId,
          branchId: showtime.branchId,
          hallId: showtime.hallId,
          startsAt: showtime.startsAt.toISOString(),
          format: showtime.format,
          priceStandard: showtime.priceStandard,
          priceVip: showtime.priceVip,
          priceCouple: showtime.priceCouple,
        }}
      />
    </div>
  );
}
