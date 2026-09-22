import { prisma } from "@/lib/db";
import { BulkShowtimeForm } from "@/components/admin/showtimes/BulkShowtimeForm";

export default async function BulkShowtimesPage() {
  const [movies, branches, halls] = await Promise.all([
    prisma.movie.findMany({ where: { status: { not: "ENDED" } }, include: { branches: true }, orderBy: { titleEn: "asc" } }),
    prisma.branch.findMany({ orderBy: { nameEn: "asc" } }),
    prisma.hall.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Bulk Create Showtimes</h1>
      <p className="mb-6 text-sm text-text-muted">
        Schedule the same times every day across a date range. Any slot that overlaps an existing showtime in that
        hall is skipped automatically.
      </p>
      <BulkShowtimeForm
        movies={movies.map((m) => ({ id: m.id, titleEn: m.titleEn, allBranches: m.allBranches, branchIds: m.branches.map((b) => b.branchId) }))}
        branches={branches}
        halls={halls.map((h) => ({ id: h.id, name: h.name, branchId: h.branchId }))}
      />
    </div>
  );
}
