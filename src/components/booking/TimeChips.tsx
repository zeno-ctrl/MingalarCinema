import Link from "next/link";
import { cn } from "@/lib/utils";
import { CINEMA_TIME_ZONE } from "@/lib/cinema-time";
import type { Locale } from "@/lib/i18n/config";

export type TimeChipShowtime = {
  id: string;
  startsAt: Date;
  format: string;
  remaining: number;
};

export function TimeChips({ showtimes, locale = "en" }: { showtimes: TimeChipShowtime[]; locale?: Locale }) {
  const now = new Date();

  if (showtimes.length === 0) {
    return <p className="text-sm text-text-muted">{locale === "mm" ? "ဤရက်အတွက် ပြသချိန်များ မရှိပါ။" : "No showtimes on this date."}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {showtimes.map((s) => {
        const isPast = s.startsAt < now;
        const isSoldOut = s.remaining <= 0;
        const disabled = isPast || isSoldOut;
        const time = s.startsAt.toLocaleTimeString(locale === "mm" ? "my-MM" : "en-US", { hour: "2-digit", minute: "2-digit", timeZone: CINEMA_TIME_ZONE });
        const format = s.format === "D2" ? "2D" : s.format === "D3" ? "3D" : s.format;
        const unavailable = isSoldOut ? (locale === "mm" ? "ရောင်းကုန်ပြီ" : "Sold out") : (locale === "mm" ? "ပြသပြီး" : "Started");

        if (disabled) {
          return (
            <span
              key={s.id}
              className="inline-flex min-h-11 cursor-not-allowed flex-col justify-center rounded-chip border border-black/10 px-3 py-2 text-sm text-text-muted dark:border-white/10"
              aria-disabled="true"
            >
              <span className="line-through">{time}</span>
              <span className="text-xs">{unavailable}</span>
            </span>
          );
        }

        return (
          <Link
            key={s.id}
            href={`/checkout/seats?showtimeId=${s.id}`}
            aria-label={`${time}, ${format} — ${locale === "mm" ? "ထိုင်ခုံရွေးချယ်ရန်" : "Select seats"}`}
            className={cn(
              "inline-flex min-h-11 items-center gap-1 rounded-chip border border-brand-red/40 px-3 py-2 text-sm font-medium text-brand-red hover:bg-brand-red/10",
            )}
          >
            {time} <span className="text-xs text-text-muted">{format}</span>
          </Link>
        );
      })}
    </div>
  );
}
