import Link from "next/link";
import { cookies } from "next/headers";
import { getActiveBranches } from "@/lib/queries/branches";
import { isLocale, defaultLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

export const metadata = { title: "Cinemas - CineTown" };

export default async function CinemasPage() {
  const branches = await getActiveBranches();
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : defaultLocale;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">Cinemas</h1>
      <div className="space-y-3">
        {branches.map((b) => (
          <Link
            key={b.id}
            href={`/cinemas/${b.slug}`}
            className="block rounded-card bg-bg-soft p-4 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <h2 className="font-medium">{locale === "mm" ? b.nameMm : b.nameEn}</h2>
            <p className="mt-1 text-sm text-text-muted">{locale === "mm" ? b.addressMm : b.addressEn}</p>
            <p className="mt-1 text-xs text-text-muted">{b.openingHours}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
