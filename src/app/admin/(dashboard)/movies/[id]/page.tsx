import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MovieForm } from "@/components/admin/movies/MovieForm";

export default async function EditMoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [movie, branches] = await Promise.all([
    prisma.movie.findUnique({ where: { id }, include: { branches: true } }),
    prisma.branch.findMany({ orderBy: { nameEn: "asc" } }),
  ]);
  if (!movie) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Edit Movie</h1>
      <MovieForm
        movieId={movie.id}
        branches={branches}
        initial={{
          titleEn: movie.titleEn,
          titleMm: movie.titleMm,
          synopsisEn: movie.synopsisEn,
          synopsisMm: movie.synopsisMm,
          cast: movie.cast.join(", "),
          director: movie.director,
          genre: movie.genre.join(", "),
          rating: movie.rating,
          runtimeMin: movie.runtimeMin,
          language: movie.language,
          subtitles: movie.subtitles || "",
          formats: movie.formats,
          posterUrl: movie.posterUrl,
          bannerUrl: movie.bannerUrl || "",
          trailerUrl: movie.trailerUrl || "",
          releaseDate: movie.releaseDate.toISOString().slice(0, 10),
          status: movie.status,
          featured: movie.featured,
          allBranches: movie.allBranches,
          branchIds: movie.branches.map((b) => b.branchId),
        }}
      />
    </div>
  );
}
