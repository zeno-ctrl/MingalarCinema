import Link from "next/link";
import Image from "next/image";
import type { Movie } from "@prisma/client";
import { RatingBadge } from "./RatingBadge";

export function MovieCard({
  movie,
  className = "w-36 flex-shrink-0 sm:w-44",
}: {
  movie: Pick<Movie, "slug" | "title" | "posterUrl" | "rating" | "genre">;
  className?: string;
}) {
  return (
    <Link href={`/movies/${movie.slug}`} className={`group block ${className}`}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-card bg-bg-soft shadow-card transition-shadow group-hover:shadow-card-hover">
        <Image
          src={movie.posterUrl}
          alt={movie.title}
          fill
          sizes="(max-width: 640px) 144px, 176px"
          className="object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute left-2 top-2">
          <RatingBadge rating={movie.rating} />
        </div>
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{movie.title}</h3>
      <p className="line-clamp-1 text-xs text-text-muted">{movie.genre.join(" • ")}</p>
    </Link>
  );
}
