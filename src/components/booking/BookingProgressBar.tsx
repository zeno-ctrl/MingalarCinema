"use client";

import { cn } from "@/lib/utils";

const steps = ["Movie", "Showtime", "Seats", "Payment"];

export function BookingProgressBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const active = stepNum <= current;
        return (
          <div key={step} className="flex flex-1 items-center gap-1">
            <div
              className={cn(
                "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                active ? "bg-brand-gradient text-white" : "bg-bg-soft text-text-muted",
              )}
            >
              {stepNum}
            </div>
            <span className={cn("hidden text-xs sm:inline", active ? "text-text" : "text-text-muted")}>{step}</span>
            {i < steps.length - 1 && (
              <div className={cn("mx-1 h-0.5 flex-1", stepNum < current ? "bg-brand-red" : "bg-bg-soft")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
