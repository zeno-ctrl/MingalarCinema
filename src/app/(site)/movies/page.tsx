import Link from "next/link";
import { cookies } from "next/headers";
import { getNowShowing, getComingSoon } from "@/lib/queries/movies";
import { MovieCard } from "@/components/movie/MovieCard";
import { isLocale, defaultLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { cn } from "@/lib/utils";

export const metadata = { title: "Movies - Mingalar Cinema" };

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "coming-soon" ? "coming-soon" : "now-showing";

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : defaultLocale;
  const dict = getDictionary(locale);

  const movies = activeTab === "now-showing" ? await getNowShowing() : await getComingSoon();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex gap-2">
        <Link
          href="/movies?tab=now-showing"
          className={cn(
            "rounded-chip px-4 py-2 text-sm font-medium",
            activeTab === "now-showing" ? "bg-brand-gradient text-white" : "bg-bg-soft text-text-muted",
          )}
        >
          {dict.home.nowShowing}
        </Link>
        <Link
          href="/movies?tab=coming-soon"
          className={cn(
            "rounded-chip px-4 py-2 text-sm font-medium",
            activeTab === "coming-soon" ? "bg-brand-gradient text-white" : "bg-bg-soft text-text-muted",
          )}
        >
          {dict.home.comingSoon}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} className="w-full" />
        ))}
      </div>
      {movies.length === 0 && <p className="text-text-muted">Nothing here yet.</p>}
    </div>
  );
}
