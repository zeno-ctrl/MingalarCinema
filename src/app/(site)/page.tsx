import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { getNowShowing, getComingSoon, getFeaturedMovies, getPublishedPromotions } from "@/lib/queries/movies";
import { MovieCard } from "@/components/movie/MovieCard";
import { Section } from "@/components/Section";
import { Hero, type HeroSlide } from "@/components/home/Hero";
import { isLocale, defaultLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

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
      title: locale === "mm" ? m.titleMm : m.titleEn,
      subtitle: m.genre.join(" • "),
      href: `/movies/${m.slug}`,
    })),
    ...promotions.map((p) => ({
      id: p.id,
      imageUrl: p.imageUrl || "",
      title: locale === "mm" ? p.titleMm : p.titleEn,
      href: "/#promotions",
    })),
  ].filter((s) => s.imageUrl);

  return (
    <div>
      <Hero slides={heroSlides} />

      <Section title={dict.home.nowShowing} seeAllHref="/movies?tab=now-showing" seeAllLabel={dict.common.seeAll}>
        {nowShowing.map((movie) => (
          <MovieCard key={movie.id} movie={movie} locale={locale} />
        ))}
        {nowShowing.length === 0 && <p className="text-sm text-text-muted">No movies showing right now.</p>}
      </Section>

      <Section title={dict.home.comingSoon} seeAllHref="/movies?tab=coming-soon" seeAllLabel={dict.common.seeAll}>
        {comingSoon.map((movie) => (
          <MovieCard key={movie.id} movie={movie} locale={locale} />
        ))}
        {comingSoon.length === 0 && <p className="text-sm text-text-muted">Nothing announced yet.</p>}
      </Section>

      {promotions.length > 0 && (
        <section id="promotions" className="py-6">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-3 text-lg font-semibold">{dict.home.newsAndPromos}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {promotions.map((promo) => (
                <Link
                  key={promo.id}
                  href="/"
                  className="overflow-hidden rounded-card bg-bg-soft shadow-card transition-shadow hover:shadow-card-hover"
                >
                  {promo.imageUrl && (
                    <div className="relative aspect-video">
                      <Image src={promo.imageUrl} alt={locale === "mm" ? promo.titleMm : promo.titleEn} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-medium">{locale === "mm" ? promo.titleMm : promo.titleEn}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-text-muted">
                      {locale === "mm" ? promo.bodyMm : promo.bodyEn}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
