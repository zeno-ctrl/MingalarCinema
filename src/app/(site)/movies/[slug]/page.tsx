import { notFound } from "next/navigation";
import Image from "next/image";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getMovieBySlug } from "@/lib/queries/movies";
import { getActiveBranches } from "@/lib/queries/branches";
import { getShowtimesForMovie, todayStr } from "@/lib/queries/showtimes";
import { annotateAvailability } from "@/lib/queries/availability";
import { isLocale, defaultLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getYoutubeEmbedUrl } from "@/lib/youtube";
import { RatingBadge } from "@/components/movie/RatingBadge";
import { DateChips } from "@/components/booking/DateChips";
import { TimeChips } from "@/components/booking/TimeChips";
import { BranchChips } from "@/components/booking/BranchChips";

const LAST_BRANCH_COOKIE = "cinetown_last_branch";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getMovieBySlug(slug);
  if (!movie) return {};
  return {
    title: `${movie.titleEn} - CineTown`,
    description: movie.synopsisEn,
    openGraph: { images: [movie.posterUrl] },
  };
}

export default async function MovieDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ branch?: string; date?: string }>;
}) {
  const { slug } = await params;
  const { branch: branchParam, date: dateParam } = await searchParams;

  const movie = await getMovieBySlug(slug);
  if (!movie) notFound();

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : defaultLocale;
  const dict = getDictionary(locale);

  const allBranches = await getActiveBranches();
  const eligibleBranches = movie.allBranches
    ? allBranches
    : allBranches.filter((b) => movie.branches.some((mb) => mb.branchId === b.id));

  const lastBranchSlug = cookieStore.get(LAST_BRANCH_COOKIE)?.value;
  const selectedBranch =
    eligibleBranches.find((b) => b.slug === branchParam) ??
    eligibleBranches.find((b) => b.slug === lastBranchSlug) ??
    eligibleBranches[0];

  const selectedDate = dateParam || todayStr();

  const showtimes = selectedBranch
    ? await getShowtimesForMovie(movie.id, selectedDate, selectedBranch.id)
    : [];
  const withAvailability = await annotateAvailability(showtimes);

  const title = locale === "mm" ? movie.titleMm : movie.titleEn;
  const synopsis = locale === "mm" ? movie.synopsisMm : movie.synopsisEn;
  const trailerEmbed = getYoutubeEmbedUrl(movie.trailerUrl);

  return (
    <div>
      <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
        <Image src={movie.bannerUrl || movie.posterUrl} alt={title} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-black/20 to-transparent" />
      </div>

      <div className="mx-auto -mt-16 max-w-6xl px-4 sm:-mt-24">
        <div className="flex gap-4 sm:gap-6">
          <div className="relative aspect-[2/3] w-28 flex-shrink-0 overflow-hidden rounded-card shadow-card-hover sm:w-40">
            <Image src={movie.posterUrl} alt={title} fill className="object-cover" sizes="160px" />
          </div>
          <div className="flex-1 pt-16 sm:pt-24">
            <div className="flex flex-wrap items-center gap-2">
              <RatingBadge rating={movie.rating} />
              <span className="text-sm text-text-muted">
                {movie.runtimeMin} {dict.movie.minutes}
              </span>
              <span className="text-sm text-text-muted">{movie.genre.join(", ")}</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h1>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <h2 className="mb-2 font-semibold">{dict.movie.synopsis}</h2>
            <p className="text-sm leading-relaxed text-text-muted">{synopsis}</p>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-text-muted">{dict.movie.director}</dt>
                <dd>{movie.director}</dd>
              </div>
              <div>
                <dt className="text-text-muted">{dict.movie.cast}</dt>
                <dd>{movie.cast.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-text-muted">{dict.movie.language}</dt>
                <dd>{movie.language}</dd>
              </div>
              {movie.subtitles && (
                <div>
                  <dt className="text-text-muted">{dict.movie.subtitles}</dt>
                  <dd>{movie.subtitles}</dd>
                </div>
              )}
              <div>
                <dt className="text-text-muted">{dict.movie.format}</dt>
                <dd>{movie.formats.join(", ")}</dd>
              </div>
            </dl>

            {trailerEmbed && (
              <div className="mt-6">
                <h2 className="mb-2 font-semibold">{dict.movie.trailer}</h2>
                <div className="aspect-video overflow-hidden rounded-card">
                  <iframe
                    src={trailerEmbed}
                    title={`${title} trailer`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-black/10 pt-6 dark:border-white/10">
          <h2 className="mb-3 font-semibold">{dict.movie.showtimes}</h2>

          {eligibleBranches.length === 0 ? (
            <p className="text-sm text-text-muted">Not currently scheduled at any branch.</p>
          ) : (
            <>
              <BranchChips
                branches={eligibleBranches.map((b) => ({
                  id: b.id,
                  slug: b.slug,
                  label: locale === "mm" ? b.nameMm : b.nameEn,
                }))}
                selectedBranchId={selectedBranch?.id}
                basePath={`/movies/${slug}`}
                selectedDate={selectedDate}
              />

              <div className="mb-4">
                <DateChips
                  base={`/movies/${slug}`}
                  otherParams={{ branch: selectedBranch?.slug || "" }}
                  selectedDate={selectedDate}
                />
              </div>

              <TimeChips showtimes={withAvailability} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
