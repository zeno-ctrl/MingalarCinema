import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: string }>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <input
        ref={ref}
        className={cn(
          "w-full rounded-chip border border-black/10 dark:border-white/15 bg-bg px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20",
          error && "border-error focus:border-error focus:ring-error/20",
          className,
        )}
        aria-invalid={!!error}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  ),
);
Input.displayName = "Input";
