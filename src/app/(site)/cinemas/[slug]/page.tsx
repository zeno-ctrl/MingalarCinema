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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const branch = await getBranchBySlug(slug);
  if (!branch) return {};
  return { title: `${branch.nameEn} - CineTown` };
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

  const selectedDate = dateParam || todayStr();
  const showtimes = await getShowtimesForBranch(branch.id, selectedDate);
  const withAvailability = await annotateAvailability(showtimes);

  const grouped = new Map<string, { title: string; slug: string; showtimes: typeof withAvailability }>();
  for (const s of withAvailability) {
    const key = s.movieId;
    if (!grouped.has(key)) {
      grouped.set(key, {
        title: locale === "mm" ? s.movie.titleMm : s.movie.titleEn,
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
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">{name}</h1>
      <p className="mt-1 text-sm text-text-muted">{address}</p>

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <a href={`tel:${branch.phone}`} className="rounded-chip bg-bg-soft px-3 py-1.5 font-medium text-brand-red">
          {dict.branch.call}: {branch.phone}
        </a>
        <span className="rounded-chip bg-bg-soft px-3 py-1.5 text-text-muted">
          {dict.branch.openingHours}: {branch.openingHours}
        </span>
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
          <iframe src={mapUrl} className="h-56 w-full border-0" loading="lazy" title="Map" />
        </div>
      )}
      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block rounded-chip bg-brand-gradient px-4 py-2 text-sm font-medium text-white"
        >
          {dict.branch.getDirections}
        </a>
      )}

      <div className="mt-8 border-t border-black/10 pt-6 dark:border-white/10">
        <h2 className="mb-3 font-semibold">{dict.movie.showtimes}</h2>
        <div className="mb-4">
          <DateChips base={`/cinemas/${slug}`} otherParams={{}} selectedDate={selectedDate} />
        </div>

        {grouped.size === 0 ? (
          <p className="text-sm text-text-muted">No showtimes on this date.</p>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.values()).map((group) => (
              <div key={group.slug}>
                <Link href={`/movies/${group.slug}`} className="mb-2 block font-medium hover:underline">
                  {group.title}
                </Link>
                <TimeChips showtimes={group.showtimes} />
              </div>
            ))}
          </div>
        )}
      </div>

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
          {branch.photos.map((photo) => (
            <div key={photo} className="relative aspect-square overflow-hidden rounded-chip">
              <Image src={photo} alt={name} fill className="object-cover" sizes="120px" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
