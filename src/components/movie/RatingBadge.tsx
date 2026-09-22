import type { MovieRating } from "@prisma/client";
import { cn } from "@/lib/utils";

const labels: Record<MovieRating, string> = {
  G: "G",
  PG: "PG",
  PG13: "PG-13",
  R: "R",
};

const colors: Record<MovieRating, string> = {
  G: "bg-success text-white",
  PG: "bg-warning text-white",
  PG13: "bg-brand-orange text-white",
  R: "bg-error text-white",
};

export function RatingBadge({ rating }: { rating: MovieRating }) {
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold shadow", colors[rating])}>
      {labels[rating]}
    </span>
  );
}
