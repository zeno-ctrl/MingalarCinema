import { cookies } from "next/headers";
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
      title: m.title,
      subtitle: m.genre.join(" • "),
      href: `/movies/${m.slug}`,
    })),
    ...promotions.map((p) => ({
      id: p.id,
      imageUrl: p.imageUrl || "",
      title: locale === "mm" ? p.titleMm : p.titleEn,
      href: "/",
    })),
  ].filter((s) => s.imageUrl);

  return (
    <div>
      <Hero slides={heroSlides} />

      <Section title={dict.home.nowShowing} seeAllHref="/movies?tab=now-showing" seeAllLabel={dict.common.seeAll}>
        {nowShowing.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
        {nowShowing.length === 0 && <p className="text-sm text-text-muted">No movies showing right now.</p>}
      </Section>

      <Section title={dict.home.comingSoon} seeAllHref="/movies?tab=coming-soon" seeAllLabel={dict.common.seeAll}>
        {comingSoon.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
        {comingSoon.length === 0 && <p className="text-sm text-text-muted">Nothing announced yet.</p>}
      </Section>
    </div>
  );
}
