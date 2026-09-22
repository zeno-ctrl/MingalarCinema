import { prisma } from "@/lib/db";
import { MovieForm } from "@/components/admin/movies/MovieForm";

export default async function NewMoviePage() {
  const branches = await prisma.branch.findMany({ orderBy: { nameEn: "asc" } });
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Add Movie</h1>
      <MovieForm branches={branches} />
    </div>
  );
}
