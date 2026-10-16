"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

export function Header() {
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const navigation = [
    { href: "/movies", label: t("nav.movies") },
    { href: "/cinemas", label: t("nav.cinemas") },
    { href: "/my-tickets", label: t("nav.myTickets") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-bg/80 backdrop-blur dark:border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-5 lg:gap-6">
          <Link href="/" className="flex min-h-11 min-w-0 items-center rounded" aria-label="Mingalar Cinema — Home">
            <span className="bg-brand-gradient bg-clip-text text-base font-extrabold leading-tight tracking-tight text-transparent sm:whitespace-nowrap sm:text-xl">
              Mingalar Cinema
            </span>
          </Link>

          <nav aria-label={locale === "mm" ? "အဓိက လမ်းညွှန်" : "Main navigation"} className="hidden shrink-0 items-center gap-4 text-sm font-medium md:flex lg:gap-6">
            {navigation.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center rounded transition-colors hover:text-brand-red", active && "text-brand-red")}>
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
