import type { Metadata } from "next";
import { Inter, Noto_Sans_Myanmar } from "next/font/google";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isLocale, defaultLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { ThemePref } from "@/lib/theme/provider";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const notoMm = Noto_Sans_Myanmar({
  subsets: ["myanmar"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-mm",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CineTown - Book Movie Tickets in Myanmar",
  description:
    "Browse now-showing and coming-soon movies, pick your seats, and book tickets online across CineTown branches in Myanmar.",
  openGraph: {
    title: "CineTown",
    description: "Book movie tickets online across CineTown branches in Myanmar.",
    type: "website",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : defaultLocale;
  const themePref = (cookieStore.get("cinetown_theme")?.value as ThemePref) || "system";
  const dict = getDictionary(locale);
  const session = await getServerSession(authOptions);

  return (
    <html lang={locale} className={themePref === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <body className={`${inter.variable} ${notoMm.variable} font-sans antialiased bg-bg text-text`}>
        <Providers session={session} locale={locale} dict={dict} themePref={themePref}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
