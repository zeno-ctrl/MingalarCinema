import Link from "next/link";
import { prisma } from "@/lib/db";
import { MoviesTable } from "@/components/admin/movies/MoviesTable";

export default async function AdminMoviesPage() {
  const movies = await prisma.movie.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Movies</h1>
        <Link href="/admin/movies/new" className="rounded-chip bg-brand-gradient px-4 py-2 text-sm font-medium text-white">
          + Add Movie
        </Link>
      </div>
      <MoviesTable
        movies={movies.map((m) => ({
          id: m.id,
          titleEn: m.titleEn,
          status: m.status,
          rating: m.rating,
          releaseDate: m.releaseDate.toISOString(),
          featured: m.featured,
        }))}
      />
    </div>
  );
}
