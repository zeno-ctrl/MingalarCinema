"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/movies", label: "Movies" },
  { href: "/admin/branches", label: "Branches" },
  { href: "/admin/halls", label: "Halls" },
  { href: "/admin/showtimes", label: "Showtimes" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/check-in", label: "Check-in" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/promo-codes", label: "Promo Codes" },
  { href: "/admin/settings", label: "Site Settings" },
  { href: "/admin/audit-log", label: "Audit Log" },
];

export function AdminSidebar({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const panelId = useId();
  const sidebarRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenPath(null);
        toggleRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (!sidebarRef.current?.contains(event.target as Node)) setOpenPath(null);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <aside ref={sidebarRef} className="sticky top-0 z-30 flex max-h-dvh flex-col border-b border-black/10 bg-bg md:fixed md:inset-y-0 md:left-0 md:w-56 md:border-b-0 md:border-r md:p-4 dark:border-white/10">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2 md:mb-6 md:p-0">
        <Link href="/admin" onClick={() => setOpenPath(null)} className="flex min-h-11 items-center rounded text-base font-extrabold text-brand-red md:text-lg">
          Mingalar Cinema Admin
        </Link>
        <button ref={toggleRef} type="button" aria-expanded={open} aria-controls={panelId} aria-label={open ? "Close admin navigation" : "Open admin navigation"} onClick={() => setOpenPath(open ? null : pathname)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-chip text-text hover:bg-black/5 md:hidden dark:hover:bg-white/10">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>
      <div id={panelId} className={cn("min-h-0 max-h-[calc(100dvh-4rem)] flex-col px-4 pb-4 md:max-h-none md:flex-1 md:px-0 md:pb-0", open ? "flex" : "hidden md:flex")}>
      <nav aria-label="Admin navigation" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {links.map((link) => {
          const active = link.href === "/admin" ? pathname === "/admin" : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpenPath(null)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-chip px-3 py-2 text-sm font-medium",
                active ? "bg-brand-gradient text-white" : "text-text-muted hover:bg-black/5 dark:hover:bg-white/10",
              )}
            >
              {link.label}
            </Link>
          );
        })}
        {isSuperAdmin && (
          <Link
            href="/admin/invites"
            onClick={() => setOpenPath(null)}
            aria-current={pathname.startsWith("/admin/invites") ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center rounded-chip px-3 py-2 text-sm font-medium",
              pathname.startsWith("/admin/invites")
                ? "bg-brand-gradient text-white"
                : "text-text-muted hover:bg-black/5 dark:hover:bg-white/10",
            )}
          >
            Admin Invites
          </Link>
        )}
      </nav>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-4 min-h-11 shrink-0 rounded-chip px-3 py-2 text-left text-sm text-text-muted hover:bg-black/5 dark:hover:bg-white/10"
      >
        Log out
      </button>
      </div>
    </aside>
  );
}
