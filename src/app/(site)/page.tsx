import { cookies } from "next/headers";
import { getNowShowing, getComingSoon, getFeaturedMovies, getPublishedPromotions } from "@/lib/queries/movies";
import { MovieCard } from "@/components/movie/MovieCard";
import { Section } from "@/components/Section";
import { Hero, type HeroSlide } from "@/components/home/Hero";
import { isLocale, defaultLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import Image from "next/image";

export default async function HomePage() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : defaultLocale;
  const dict = getDictionary(locale);

  const [nowShowing, comingSoon, featured, promotions] = await Promise.all([
    getNowShowing(),
    getComingSoon(),
    getFeaturedMovies(),
    getPublishedPromotions(),
  ]);

  const heroSlides: HeroSlide[] = [
    ...featured.map((m) => ({
      id: m.id,
      imageUrl: m.bannerUrl || m.posterUrl,
      title: m.title,
      subtitle: m.genre.join(" • "),
      href: `/movies/${m.slug}`,
    })),
    ...promotions.map((p) => ({
      id: p.id,
      imageUrl: p.imageUrl || "",
      title: locale === "mm" ? p.titleMm : p.titleEn,
      href: "#promotions",
    })),
  ].filter((s) => s.imageUrl);

  return (
    <div>
      <h1 className="sr-only">Mingalar Cinema — {dict.nav.movies}</h1>
      <Hero slides={heroSlides} />

      <Section title={dict.home.nowShowing} seeAllHref="/movies?tab=now-showing" seeAllLabel={dict.common.seeAll}>
        {nowShowing.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
        {nowShowing.length === 0 && <p className="text-sm text-text-muted">{locale === "mm" ? "ယခုပြသနေသော ရုပ်ရှင်များ မရှိသေးပါ။ နောက်မှ ပြန်လည်ကြည့်ရှုပါ။" : "No movies showing right now. Check back for the next releases."}</p>}
      </Section>

      <Section title={dict.home.comingSoon} seeAllHref="/movies?tab=coming-soon" seeAllLabel={dict.common.seeAll}>
        {comingSoon.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
        {comingSoon.length === 0 && <p className="text-sm text-text-muted">{locale === "mm" ? "မကြာမီလာမည့် ရုပ်ရှင်များကို မကြေညာရသေးပါ။" : "Upcoming releases will appear here once announced."}</p>}
      </Section>

      {promotions.length > 0 && (
        <section id="promotions" aria-labelledby="promotions-heading" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-6">
          <h2 id="promotions-heading" className="mb-3 text-lg font-semibold">{dict.home.newsAndPromos}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {promotions.map((promotion) => (
              <article key={promotion.id} className="overflow-hidden rounded-card bg-bg-soft shadow-card">
                {promotion.imageUrl && (
                  <div className="relative aspect-[2/1]">
                    <Image src={promotion.imageUrl} alt="" fill sizes="(max-width: 640px) 100vw, 560px" className="object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold">{locale === "mm" ? promotion.titleMm : promotion.titleEn}</h3>
                  <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-text-muted">{locale === "mm" ? promotion.bodyMm : promotion.bodyEn}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
