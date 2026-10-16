"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/",
    key: "nav.home",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    href: "/movies",
    key: "nav.movies",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4" />
      </svg>
    ),
  },
  {
    href: "/cinemas",
    key: "nav.cinemas",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
        <path d="M12 21s-7-6.1-7-11a7 7 0 0114 0c0 4.9-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    href: "/my-tickets",
    key: "nav.myTickets",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
        <path d="M3 9a2 2 0 002-2V6a1 1 0 011-1h12a1 1 0 011 1v1a2 2 0 000 4v1a2 2 0 000 4v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1a2 2 0 002-2" />
        <path d="M9 5v14" strokeDasharray="2 2" />
      </svg>
    ),
  },
  {
    href: "/profile",
    key: "nav.profile",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t, locale } = useI18n();

  return (
    <nav aria-label={locale === "mm" ? "အဓိက လမ်းညွှန်" : "Main navigation"} className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-white/10">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[10px] leading-tight transition-colors sm:text-[11px]",
                active ? "text-brand-red" : "text-text-muted",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span aria-hidden="true">{item.icon(active)}</span>
              <span className="max-w-full break-words">{t(item.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
