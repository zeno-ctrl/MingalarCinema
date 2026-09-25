import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The brand wordmark: the icon stands in for the capital "M", followed by
 * "ingalar Cinema" as text, so together they read as one word. alt="M" (not
 * "Mingalar Cinema") so a screen reader says the whole name once, not twice.
 */
export function Logo({
  size = 28,
  textClassName,
  gradient = false,
}: {
  size?: number;
  textClassName?: string;
  gradient?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Image src="/logo.png" alt="M" width={size} height={size} className="rounded-md" priority />
      <span
        className={cn(
          "font-extrabold tracking-tight",
          gradient ? "bg-brand-gradient bg-clip-text text-transparent" : "text-brand-red",
          textClassName,
        )}
      >
        ingalar Cinema
      </span>
    </span>
  );
}
