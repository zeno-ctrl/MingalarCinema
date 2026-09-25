"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

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

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-black/10 bg-bg p-4 md:flex dark:border-white/10">
      <Link href="/admin" className="mb-6 block">
        <Logo textClassName="text-lg" /> <span className="text-lg font-extrabold text-brand-red">Admin</span>
      </Link>
      <nav className="flex-1 space-y-0.5">
        {links.map((link) => {
          const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block rounded-chip px-3 py-2 text-sm font-medium",
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
            className={cn(
              "block rounded-chip px-3 py-2 text-sm font-medium",
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
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-4 rounded-chip px-3 py-2 text-left text-sm text-text-muted hover:bg-black/5 dark:hover:bg-white/10"
      >
        Log out
      </button>
    </aside>
  );
}
