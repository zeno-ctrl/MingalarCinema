"use client";

import { useState, useRef, useEffect, useId } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";

export function UserMenu() {
  const { data: session, status } = useSession();
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedOnPath, setOpenedOnPath] = useState(pathname);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const isOpen = open && openedOnPath === pathname;

  useEffect(() => {
    function onClick(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  if (status === "loading") {
    return <span className="skeleton h-11 w-16 rounded-chip" role="status" aria-label={t("common.loading")} />;
  }

  if (!session?.user) {
    return (
      <Link
        href={pathname === "/" ? "/login" : `/login?callbackUrl=${encodeURIComponent(pathname)}`}
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-chip bg-brand-gradient px-3 text-xs font-medium text-white sm:px-4 sm:text-sm"
      >
        {t("common.login")}
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setOpenedOnPath(pathname); setOpen(!isOpen); }}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white"
        aria-label={locale === "mm" ? "အကောင့် မီနူး" : "Account menu"}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
      >
        {session.user.name?.[0]?.toUpperCase() ?? "U"}
      </button>
      {isOpen && (
        <div id={panelId} className="absolute right-0 top-12 z-50 w-52 max-w-[calc(100vw-2rem)] rounded-card border border-black/10 bg-bg py-2 shadow-card-hover dark:border-white/10">
          <div className="border-b border-black/5 px-4 pb-2 text-sm dark:border-white/10">
            <p className="truncate font-semibold">{session.user.name || session.user.email}</p>
          </div>
          {session.user.role !== "USER" && (
            <Link onClick={() => setOpen(false)} href={session.user.role === "CASHIER" ? "/cashier" : "/admin"} className="flex min-h-11 items-center px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
              {session.user.role === "CASHIER" ? (locale === "mm" ? "ငွေရှင်းကောင်တာ" : "Cashier dashboard") : (locale === "mm" ? "စီမံခန့်ခွဲမှု" : "Admin dashboard")}
            </Link>
          )}
          <Link onClick={() => setOpen(false)} href="/my-tickets" className="flex min-h-11 items-center px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
            {t("nav.myTickets")}
          </Link>
          <Link onClick={() => setOpen(false)} href="/profile" className="flex min-h-11 items-center px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
            {t("nav.profile")}
          </Link>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => { setSigningOut(true); void signOut({ callbackUrl: "/" }).catch(() => setSigningOut(false)); }}
            className="block min-h-11 w-full px-4 py-2 text-left text-sm text-error hover:bg-black/5 disabled:cursor-wait disabled:opacity-60 dark:hover:bg-white/10"
          >
            {t(signingOut ? "common.loading" : "common.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
