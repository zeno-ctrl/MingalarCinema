import Link from "next/link";
import { getBrandSettings } from "@/lib/settings";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

export async function Header() {
  const brand = await getBrandSettings();

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-bg/80 backdrop-blur dark:border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="bg-brand-gradient bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
            {brand.logoText}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/movies" className="hover:text-brand-red">
            Movies
          </Link>
          <Link href="/cinemas" className="hover:text-brand-red">
            Cinemas
          </Link>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
