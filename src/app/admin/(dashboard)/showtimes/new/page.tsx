import { prisma } from "@/lib/db";
import { ShowtimeForm } from "@/components/admin/showtimes/ShowtimeForm";

export default async function NewShowtimePage() {
  const [movies, branches, halls] = await Promise.all([
    prisma.movie.findMany({ where: { status: { not: "ENDED" } }, include: { branches: true }, orderBy: { title: "asc" } }),
    prisma.branch.findMany({ orderBy: { nameEn: "asc" } }),
    prisma.hall.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Add Showtime</h1>
      <ShowtimeForm
        movies={movies.map((m) => ({ id: m.id, title: m.title, allBranches: m.allBranches, branchIds: m.branches.map((b) => b.branchId) }))}
        branches={branches}
        halls={halls.map((h) => ({ id: h.id, name: h.name, branchId: h.branchId }))}
      />
    </div>
  );
}
