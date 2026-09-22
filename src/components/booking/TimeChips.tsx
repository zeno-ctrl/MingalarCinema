import Link from "next/link";
import { cn } from "@/lib/utils";

export type TimeChipShowtime = {
  id: string;
  startsAt: Date;
  format: string;
  remaining: number;
};

export function TimeChips({ showtimes }: { showtimes: TimeChipShowtime[] }) {
  const now = new Date();

  if (showtimes.length === 0) {
    return <p className="text-sm text-text-muted">No showtimes on this date.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {showtimes.map((s) => {
        const isPast = s.startsAt < now;
        const isSoldOut = s.remaining <= 0;
        const disabled = isPast || isSoldOut;
        const time = s.startsAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

        if (disabled) {
          return (
            <span
              key={s.id}
              className="cursor-not-allowed rounded-chip border border-black/10 px-3 py-2 text-sm text-text-muted line-through dark:border-white/10"
              title={isSoldOut ? "Sold out" : "Already showed"}
            >
              {time}
            </span>
          );
        }

        return (
          <Link
            key={s.id}
            href={`/checkout/seats?showtimeId=${s.id}`}
            className={cn(
              "rounded-chip border border-brand-red/40 px-3 py-2 text-sm font-medium text-brand-red hover:bg-brand-red/10",
            )}
          >
            {time} <span className="text-xs text-text-muted">{s.format}</span>
          </Link>
        );
      })}
    </div>
  );
}
