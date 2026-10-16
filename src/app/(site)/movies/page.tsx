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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{dict.nav.movies}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
          {locale === "mm"
            ? "သင်ကြည့်ရှုလိုသော ရုပ်ရှင်ကို ရွေးပြီး ပြသချိန်နှင့် ရုံခွဲများကို ကြည့်ရှုပါ။"
            : "Find your next film. Explore the details, choose a cinema, and make it a movie night."}
        </p>
      </div>

      <nav aria-label={locale === "mm" ? "ရုပ်ရှင်အမျိုးအစား" : "Movie listings"} className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/movies?tab=now-showing"
          aria-current={activeTab === "now-showing" ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center rounded-chip px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "now-showing" ? "bg-brand-gradient text-white" : "bg-bg-soft text-text-muted hover:text-brand-red",
          )}
        >
          {dict.home.nowShowing}
        </Link>
        <Link
          href="/movies?tab=coming-soon"
          aria-current={activeTab === "coming-soon" ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center rounded-chip px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "coming-soon" ? "bg-brand-gradient text-white" : "bg-bg-soft text-text-muted hover:text-brand-red",
          )}
        >
          {dict.home.comingSoon}
        </Link>
      </nav>

      <section aria-labelledby="movie-list-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="movie-list-heading" className="font-semibold">
            {activeTab === "now-showing" ? dict.home.nowShowing : dict.home.comingSoon}
          </h2>
          <span className="text-sm text-text-muted">
            {locale === "mm" ? `ရုပ်ရှင် ${movies.length} ကား` : `${movies.length} ${movies.length === 1 ? "film" : "films"}`}
          </span>
        </div>
        {movies.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} className="w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-black/10 bg-bg-soft px-5 py-10 text-center dark:border-white/10">
            <p className="font-medium">
              {locale === "mm" ? "ရုပ်ရှင်စာရင်း မရှိသေးပါ။" : "No films listed just yet."}
            </p>
            <p className="mt-2 text-sm text-text-muted">
              {locale === "mm" ? "အခြားရုပ်ရှင်များကို ကြည့်ရှုပါ သို့မဟုတ် နောက်မှ ပြန်လည်ကြည့်ရှုပါ။" : "Explore the other collection, or check back for new releases."}
            </p>
            <Link
              href={activeTab === "now-showing" ? "/movies?tab=coming-soon" : "/movies?tab=now-showing"}
              className="mt-4 inline-flex min-h-11 items-center rounded-chip bg-brand-gradient px-4 py-2 text-sm font-medium text-white"
            >
              {activeTab === "now-showing" ? dict.home.comingSoon : dict.home.nowShowing}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
