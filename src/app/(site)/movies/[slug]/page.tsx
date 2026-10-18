import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
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

const LAST_BRANCH_COOKIE = "mingalar_last_branch";

function validDate(value: string | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return todayStr();
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : todayStr();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getMovieBySlug(slug);
  if (!movie) return {};
  return {
    title: `${movie.title} - Mingalar Cinema`,
    description: movie.synopsis,
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

  let selectedDate = validDate(dateParam);
  const hasExplicitDate = dateParam === selectedDate;

  const showtimes = selectedBranch
    ? await getShowtimesForMovie(movie.id, selectedDate, selectedBranch.id)
    : [];
  let withAvailability = await annotateAvailability(showtimes);
  let showingNextAvailableDate = false;
  const now = new Date();
  if (selectedBranch && !hasExplicitDate && !withAvailability.some((showtime) => showtime.startsAt > now && showtime.remaining > 0)) {
    for (let offset = 1; offset < 7; offset++) {
      const date = todayStr(offset);
      const candidates = await annotateAvailability(await getShowtimesForMovie(movie.id, date, selectedBranch.id));
      if (candidates.some((showtime) => showtime.startsAt > now && showtime.remaining > 0)) {
        selectedDate = date;
        withAvailability = candidates;
        showingNextAvailableDate = true;
        break;
      }
    }
  }
  const includesSampleShowtimes = withAvailability.some((showtime) => showtime.id.startsWith("auto_"));

  const title = movie.title;
  const synopsis = movie.synopsis;
  const trailerEmbed = getYoutubeEmbedUrl(movie.trailerUrl);
  const branchName = selectedBranch ? (locale === "mm" ? selectedBranch.nameMm : selectedBranch.nameEn) : "";

  return (
    <div>
      <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
        <Image src={movie.bannerUrl || movie.posterUrl} alt={title} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-black/20 to-transparent" />
      </div>

      <div className="relative mx-auto -mt-16 max-w-6xl px-4 pb-8 sm:-mt-24 sm:pb-12">
        <div className="flex gap-4 sm:gap-6">
          <div className="relative aspect-[2/3] w-28 flex-shrink-0 self-start overflow-hidden rounded-card shadow-card-hover sm:w-40">
            <Image src={movie.posterUrl} alt={title} fill className="object-cover" sizes="160px" />
          </div>
          <div className="min-w-0 flex-1 pt-16 sm:pt-24">
            <div className="flex flex-wrap items-center gap-2">
              <RatingBadge rating={movie.rating} />
              <span className="text-sm text-text-muted">
                {movie.runtimeMin} {dict.movie.minutes}
              </span>
              <span className="text-sm text-text-muted">{movie.genre.join(", ")}</span>
            </div>
            <h1 className="mt-1 break-words text-2xl font-bold sm:text-3xl">{title}</h1>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {eligibleBranches.length > 0 && (
            <a href="#showtimes" className="inline-flex min-h-11 items-center rounded-chip bg-brand-gradient px-5 py-2 text-sm font-semibold text-white">
              {dict.movie.showtimes} <span aria-hidden="true" className="ml-2">&darr;</span>
            </a>
          )}
          {trailerEmbed && (
            <a href="#trailer" className="inline-flex min-h-11 items-center rounded-chip bg-bg-soft px-4 py-2 text-sm font-medium hover:text-brand-red">
              {dict.movie.trailer}
            </a>
          )}
          <Link href="/movies" className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-text-muted hover:text-brand-red">
            <span aria-hidden="true" className="mr-2">&larr;</span>{dict.nav.movies}
          </Link>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <h2 className="mb-2 font-semibold">{dict.movie.synopsis}</h2>
            <p className="text-sm leading-relaxed text-text-muted">{synopsis}</p>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 break-words rounded-card bg-bg-soft p-4 text-sm sm:grid-cols-3 [&>div]:min-w-0">
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
              <section id="trailer" aria-labelledby="trailer-heading" className="mt-6 scroll-mt-24">
                <h2 id="trailer-heading" className="mb-2 font-semibold">{dict.movie.trailer}</h2>
                <div className="aspect-video overflow-hidden rounded-card">
                  <iframe
                    src={trailerEmbed}
                    title={`${title} — ${dict.movie.trailer}`}
                    className="h-full w-full"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </section>
            )}
          </div>
        </div>

        <section id="showtimes" aria-labelledby="showtimes-heading" className="mt-8 scroll-mt-24 border-t border-black/10 pt-6 dark:border-white/10">
          <h2 id="showtimes-heading" className="text-xl font-semibold">{dict.movie.showtimes}</h2>

          {eligibleBranches.length === 0 ? (
            <div className="mt-4 rounded-card bg-bg-soft p-5">
              <p className="font-medium">{locale === "mm" ? "ပြသချိန်များ မရှိသေးပါ။" : "Showtimes have not been announced yet."}</p>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {locale === "mm" ? "နောက်မှ ပြန်လည်ကြည့်ရှုပါ သို့မဟုတ် အခြားရုပ်ရှင်များကို ကြည့်ရှုပါ။" : "Check back for the schedule, or explore what's showing now."}
              </p>
              <Link href="/movies?tab=now-showing" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-brand-red hover:underline">
                {dict.home.nowShowing} <span aria-hidden="true" className="ml-2">&rarr;</span>
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-4 mt-2 text-sm text-text-muted">{dict.booking.selectBranchDate}</p>
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
                  locale={locale}
                />
                {showingNextAvailableDate && (
                  <p className="mt-2 text-sm text-text-muted">
                    {locale === "mm" ? "ယနေ့အတွက် ကြိုတင်မှာယူနိုင်သည့် ပြသချိန် မကျန်တော့ပါ။ အနီးဆုံးရက်၏ ပြသချိန်များကို ဖော်ပြထားပါသည်။" : "No more available shows today. Showing the next available date."}
                  </p>
                )}
                {includesSampleShowtimes && (
                  <p className="mt-2 text-xs text-text-muted">
                    {locale === "mm" ? "နမူနာပြသချိန်များ ပါဝင်သည် · မြန်မာစံတော်ချိန်" : "Includes sample showtimes · Myanmar time"}
                  </p>
                )}
              </div>

              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="font-medium">{branchName}</p>
                {selectedBranch && (
                  <Link href={`/cinemas/${selectedBranch.slug}`} className="inline-flex min-h-11 items-center text-brand-red hover:underline">
                    {locale === "mm" ? "ရုံအချက်အလက်နှင့် လမ်းညွှန်" : "Cinema details & directions"} <span aria-hidden="true" className="ml-1">&rarr;</span>
                  </Link>
                )}
              </div>

              {withAvailability.length === 0 ? (
                <div className="rounded-card bg-bg-soft p-5">
                  <p className="font-medium">{locale === "mm" ? "ဤရက်အတွက် ပြသချိန်များ မရှိပါ။" : "No showtimes for this date."}</p>
                  <p className="mt-2 text-sm text-text-muted">{locale === "mm" ? "အခြားရက် သို့မဟုတ် ရုံခွဲကို ရွေးချယ်ကြည့်ပါ။" : "Try another date or choose a different cinema above."}</p>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-sm text-text-muted">{locale === "mm" ? "ထိုင်ခုံရွေးရန် ပြသချိန်တစ်ခုကို ရွေးပါ။" : "Choose a showtime to select your seats."}</p>
                  <TimeChips showtimes={withAvailability} locale={locale} />
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
