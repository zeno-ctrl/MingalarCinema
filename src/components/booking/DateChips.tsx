import Link from "next/link";
import { cn } from "@/lib/utils";

function buildHref(base: string, params: Record<string, string>) {
  const usp = new URLSearchParams(params);
  return `${base}?${usp.toString()}`;
}

export function DateChips({
  base,
  otherParams,
  selectedDate,
  days = 7,
}: {
  base: string;
  otherParams: Record<string, string>;
  selectedDate: string;
  days?: number;
}) {
  const options = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const value = d.toISOString().slice(0, 10);
    const label =
      i === 0
        ? "Today"
        : i === 1
          ? "Tomorrow"
          : d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
    return { value, label };
  });

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((opt) => (
        <Link
          key={opt.value}
          href={buildHref(base, { ...otherParams, date: opt.value })}
          scroll={false}
          className={cn(
            "flex-shrink-0 rounded-chip px-4 py-2 text-sm font-medium",
            opt.value === selectedDate ? "bg-brand-gradient text-white" : "bg-bg-soft text-text",
          )}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
