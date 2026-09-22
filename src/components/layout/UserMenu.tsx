"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";

export function UserMenu() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="rounded-chip bg-brand-gradient px-4 py-2 text-sm font-medium text-white"
      >
        {t("common.login")}
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white"
        aria-label="Account menu"
      >
        {session.user.name?.[0]?.toUpperCase() ?? "U"}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-48 rounded-card border border-black/10 bg-bg py-2 shadow-card-hover dark:border-white/10">
          {session.user.role !== "USER" && (
            <Link href="/admin" className="block px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
              Admin dashboard
            </Link>
          )}
          <Link href="/my-tickets" className="block px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
            {t("nav.myTickets")}
          </Link>
          <Link href="/profile" className="block px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
            {t("nav.profile")}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="block w-full px-4 py-2 text-left text-sm text-error hover:bg-black/5 dark:hover:bg-white/10"
          >
            {t("common.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
