import Link from "next/link";
import { cookies } from "next/headers";
import { getActiveBranches } from "@/lib/queries/branches";
import { isLocale, defaultLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const metadata = { title: "Cinemas - Mingalar Cinema" };

export default async function CinemasPage() {
  const branches = await getActiveBranches();
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : defaultLocale;
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">{dict.nav.cinemas}</h1>
      <p className="mb-6 mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
        {locale === "mm"
          ? "သင်နှင့်အနီးဆုံး ရုပ်ရှင်ရုံကို ရွေးပြီး ပြသချိန်၊ လမ်းညွှန်နှင့် ရုံအချက်အလက်များကို ကြည့်ရှုပါ။"
          : "Find your local Mingalar Cinema. Check showtimes, plan your visit, and find your way here."}
      </p>
      <ul className="space-y-3">
        {branches.map((b) => (
          <li key={b.id}>
            <Link
              href={`/cinemas/${b.slug}`}
              className="group flex items-start justify-between gap-4 rounded-card border border-black/5 bg-bg-soft p-4 shadow-card transition-shadow hover:shadow-card-hover dark:border-white/5 sm:p-5"
            >
              <div className="min-w-0">
                <h2 className="break-words font-semibold transition-colors group-hover:text-brand-red">{locale === "mm" ? b.nameMm : b.nameEn}</h2>
                <p className="mt-1 break-words text-sm leading-relaxed text-text-muted">{locale === "mm" ? b.addressMm : b.addressEn}</p>
                {b.openingHours && (
                  <p className="mt-2 text-xs text-text-muted">{dict.branch.openingHours}: {b.openingHours}</p>
                )}
                <p className="mt-3 text-sm font-medium text-brand-red">{dict.movie.showtimes} <span aria-hidden="true">&rarr;</span></p>
              </div>
              <span aria-hidden="true" className="mt-1 text-xl text-text-muted transition-colors group-hover:text-brand-red">&rsaquo;</span>
            </Link>
          </li>
        ))}
      </ul>
      {branches.length === 0 && (
        <div className="rounded-card border border-black/10 bg-bg-soft px-5 py-10 text-center dark:border-white/10">
          <p className="font-medium">{locale === "mm" ? "ရုပ်ရှင်ရုံစာရင်း မရှိသေးပါ။" : "Cinema details are on their way."}</p>
          <p className="mt-2 text-sm text-text-muted">{locale === "mm" ? "နောက်မှ ပြန်လည်ကြည့်ရှုပါ သို့မဟုတ် ရုပ်ရှင်များကို ကြည့်ရှုပါ။" : "Check back soon, or explore the films in our collection."}</p>
          <Link href="/movies" className="mt-4 inline-flex min-h-11 items-center rounded-chip bg-brand-gradient px-4 py-2 text-sm font-medium text-white">
            {dict.nav.movies}
          </Link>
        </div>
      )}
    </div>
  );
}
