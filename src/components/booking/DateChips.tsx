import Link from "next/link";
import { cn } from "@/lib/utils";
import { cinemaDate } from "@/lib/cinema-time";
import type { Locale } from "@/lib/i18n/config";

function buildHref(base: string, params: Record<string, string>) {
  const usp = new URLSearchParams(params);
  return `${base}?${usp.toString()}`;
}

export function DateChips({
  base,
  otherParams,
  selectedDate,
  days = 7,
  locale = "en",
}: {
  base: string;
  otherParams: Record<string, string>;
  selectedDate: string;
  days?: number;
  locale?: Locale;
}) {
  const options = Array.from({ length: days }, (_, i) => {
    const value = cinemaDate(i);
    const d = new Date(`${value}T12:00:00Z`);
    const label =
      i === 0
        ? locale === "mm" ? "ယနေ့" : "Today"
        : i === 1
          ? locale === "mm" ? "မနက်ဖြန်" : "Tomorrow"
          : d.toLocaleDateString(locale === "mm" ? "my-MM" : "en-US", { weekday: "short", day: "numeric", timeZone: "UTC" });
    return { value, label };
  });

  return (
    <div aria-label={locale === "mm" ? "ပြသရက် ရွေးချယ်ရန်" : "Choose a date"} className="flex gap-2 overflow-x-auto pb-2">
      {options.map((opt) => (
        <Link
          key={opt.value}
          href={buildHref(base, { ...otherParams, date: opt.value })}
          scroll={false}
          aria-current={opt.value === selectedDate ? "date" : undefined}
          className={cn(
            "inline-flex min-h-11 flex-shrink-0 items-center rounded-chip px-4 py-2 text-sm font-medium",
            opt.value === selectedDate ? "bg-brand-gradient text-white" : "bg-bg-soft text-text",
          )}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
