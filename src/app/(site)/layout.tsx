import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/i18n/config";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const locale = (await cookies()).get(LOCALE_COOKIE)?.value;
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="sr-only fixed left-4 top-3 z-[60] rounded-chip bg-brand-gradient px-4 py-3 font-medium text-white focus:not-sr-only">
        {locale === "mm" ? "အကြောင်းအရာသို့ ကျော်သွားရန်" : "Skip to content"}
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
      <footer className="border-t px-4 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] text-center text-sm text-text-muted md:pb-5">
        <Link href="/download" className="inline-flex min-h-11 items-center rounded font-medium text-brand-red underline underline-offset-4">
          {locale === "mm" ? "အက်ပ် ရယူရန်" : "Get the Mingalar Cinema app"}
        </Link>
      </footer>
      <BottomNav />
    </div>
  );
}
