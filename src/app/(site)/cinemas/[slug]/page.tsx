import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getBranchBySlug } from "@/lib/queries/branches";
import { getShowtimesForBranch, todayStr } from "@/lib/queries/showtimes";
import { annotateAvailability } from "@/lib/queries/availability";
import { getMapEmbedUrl, getDirectionsUrl } from "@/lib/maps";
import { isLocale, defaultLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { DateChips } from "@/components/booking/DateChips";
import { TimeChips } from "@/components/booking/TimeChips";

function validDate(value: string | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return todayStr();
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : todayStr();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const branch = await getBranchBySlug(slug);
  if (!branch) return {};
  return { title: `${branch.nameEn} - Mingalar Cinema` };
}

export default async function BranchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { slug } = await params;
  const { date: dateParam } = await searchParams;
  const branch = await getBranchBySlug(slug);
  if (!branch) notFound();

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : defaultLocale;
  const dict = getDictionary(locale);

  let selectedDate = validDate(dateParam);
  const hasExplicitDate = dateParam === selectedDate;
  const showtimes = await getShowtimesForBranch(branch.id, selectedDate);
  let withAvailability = await annotateAvailability(showtimes);
  let showingNextAvailableDate = false;
  const now = new Date();
  if (!hasExplicitDate && !withAvailability.some((showtime) => showtime.startsAt > now && showtime.remaining > 0)) {
    for (let offset = 1; offset < 7; offset++) {
      const date = todayStr(offset);
      const candidates = await annotateAvailability(await getShowtimesForBranch(branch.id, date));
      if (candidates.some((showtime) => showtime.startsAt > now && showtime.remaining > 0)) {
        selectedDate = date;
        withAvailability = candidates;
        showingNextAvailableDate = true;
        break;
      }
    }
  }
  const includesSampleShowtimes = withAvailability.some((showtime) => showtime.id.startsWith("auto_"));

  const grouped = new Map<string, { title: string; slug: string; showtimes: typeof withAvailability }>();
  for (const s of withAvailability) {
    const key = s.movieId;
    if (!grouped.has(key)) {
      grouped.set(key, {
        title: s.movie.title,
        slug: s.movie.slug,
        showtimes: [],
      });
    }
    grouped.get(key)!.showtimes.push(s);
  }

  const mapUrl = getMapEmbedUrl(branch.latitude, branch.longitude, branch.nameEn);
  const directionsUrl = getDirectionsUrl(branch.latitude, branch.longitude);
  const name = locale === "mm" ? branch.nameMm : branch.nameEn;
  const address = locale === "mm" ? branch.addressMm : branch.addressEn;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <Link href="/cinemas" className="mb-4 inline-flex min-h-11 items-center text-sm font-medium text-text-muted hover:text-brand-red">
        <span aria-hidden="true" className="mr-2">&larr;</span>{dict.nav.cinemas}
      </Link>
      <h1 className="break-words text-2xl font-semibold">{name}</h1>
      <p className="mt-2 break-words text-sm leading-relaxed text-text-muted">{address}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <a href="#showtimes" className="inline-flex min-h-11 items-center rounded-chip bg-brand-gradient px-4 py-2 font-semibold text-white">
          {dict.movie.showtimes} <span aria-hidden="true" className="ml-2">&darr;</span>
        </a>
        {branch.phone && (
          <a href={`tel:${branch.phone}`} className="inline-flex min-h-11 items-center rounded-chip bg-bg-soft px-3 py-2 font-medium text-brand-red">
            {dict.branch.call}: {branch.phone}
          </a>
        )}
        {branch.openingHours && (
          <span className="rounded-chip bg-bg-soft px-3 py-2 text-text-muted">
            {dict.branch.openingHours}: {branch.openingHours}
          </span>
        )}
      </div>

      {branch.facilities.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-2 text-sm font-semibold text-text-muted">{dict.branch.facilities}</h2>
          <div className="flex flex-wrap gap-2">
            {branch.facilities.map((f) => (
              <span key={f} className="rounded-chip bg-bg-soft px-3 py-1 text-xs">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {mapUrl && (
        <div className="mt-4 overflow-hidden rounded-card">
          <iframe src={mapUrl} className="h-56 w-full border-0" loading="lazy" title={locale === "mm" ? `${name} တည်နေရာပြမြေပုံ` : `Location of ${name}`} />
        </div>
      )}
      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center rounded-chip bg-bg-soft px-4 py-2 text-sm font-medium text-brand-red hover:underline"
        >
          {dict.branch.getDirections}
          <span className="sr-only">{locale === "mm" ? " (စာမျက်နှာအသစ်တွင် ဖွင့်မည်)" : " (opens in a new tab)"}</span>
        </a>
      )}

      <section id="showtimes" aria-labelledby="showtimes-heading" className="mt-8 scroll-mt-24 border-t border-black/10 pt-6 dark:border-white/10">
        <h2 id="showtimes-heading" className="text-xl font-semibold">{dict.movie.showtimes}</h2>
        <p className="mb-4 mt-2 text-sm text-text-muted">{locale === "mm" ? "ရက်စွဲကို ရွေးပြီး ထိုင်ခုံရွေးရန် ပြသချိန်တစ်ခုကို ရွေးပါ။" : "Pick a date, then choose a showtime to select your seats."}</p>
        <div className="mb-4">
          <DateChips base={`/cinemas/${slug}`} otherParams={{}} selectedDate={selectedDate} locale={locale} />
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

        {grouped.size === 0 ? (
          <div className="rounded-card bg-bg-soft p-5">
            <p className="font-medium">{locale === "mm" ? "ဤရက်အတွက် ပြသချိန်များ မရှိပါ။" : "No showtimes for this date."}</p>
            <p className="mt-2 text-sm text-text-muted">{locale === "mm" ? "အခြားရက်ကို ရွေးပါ သို့မဟုတ် အခြားရုပ်ရှင်ရုံများကို ကြည့်ရှုပါ။" : "Try another date above, or explore our other cinemas."}</p>
            <Link href="/cinemas" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-brand-red hover:underline">
              {dict.nav.cinemas} <span aria-hidden="true" className="ml-2">&rarr;</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.values()).map((group) => (
              <div key={group.slug} className="rounded-card border border-black/10 p-4 dark:border-white/10">
                <h3 className="mb-3 font-semibold">
                  <Link href={`/movies/${group.slug}?branch=${slug}&date=${selectedDate}`} className="inline-flex min-h-11 max-w-full items-center gap-2 hover:text-brand-red hover:underline">
                    <span className="min-w-0 break-words">{group.title}</span> <span aria-hidden="true" className="shrink-0 text-sm text-text-muted">&rarr;</span>
                  </Link>
                </h3>
                <TimeChips showtimes={group.showtimes} locale={locale} />
              </div>
            ))}
          </div>
        )}
      </section>

      {branch.halls.length > 0 && (
        <div className="mt-8 border-t border-black/10 pt-6 dark:border-white/10">
          <h2 className="mb-2 font-semibold">{dict.branch.halls}</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {branch.halls.map((h) => (
              <li key={h.id} className="rounded-chip bg-bg-soft px-3 py-1.5">
                {h.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {branch.photos.length > 0 && (
        <div className="mt-8 grid grid-cols-3 gap-2">
          {branch.photos.map((photo, index) => (
            <div key={photo} className="relative aspect-square overflow-hidden rounded-chip">
              <Image src={photo} alt={locale === "mm" ? `${name} — ဓာတ်ပုံ ${index + 1}` : `${name} — photo ${index + 1}`} fill className="object-cover" sizes="(max-width: 768px) 33vw, 240px" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
