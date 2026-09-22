import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-brand-gradient text-white hover:brightness-95 active:brightness-90 disabled:opacity-50",
  secondary: "bg-bg-soft text-text hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50",
  ghost: "bg-transparent text-text hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50",
  danger: "bg-error text-white hover:brightness-95 disabled:opacity-50",
};

export function Button({
  variant = "primary",
  className,
  loading,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-chip px-5 py-3 font-medium text-sm transition-colors",
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      )}
      {children}
    </button>
  );
}
