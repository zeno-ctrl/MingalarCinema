import type { Metadata } from "next";
import Link from "next/link";
import { InstallAppButton } from "@/components/install/InstallAppButton";

export const metadata: Metadata = {
  title: "Get the App - Mingalar Cinema",
  description: "Install Mingalar Cinema on Android, iPhone, iPad, or your computer, or use it in your browser.",
};

export default function DownloadPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="max-w-2xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-red">Your next movie, a tap away</p>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Take Mingalar Cinema with you.</h1>
        <p className="mt-4 text-base leading-relaxed text-text-muted sm:text-lg">
          Find your movie, choose your seats, and keep your tickets close. Use the website on your phone,
          tablet, or computer, or add it to your home screen for an app experience.
        </p>
      </div>

      <section aria-labelledby="web-app-title" className="my-8 rounded-card border bg-bg-soft p-5 sm:p-8">
        <h2 id="web-app-title" className="text-xl font-semibold">One web app across your devices</h2>
        <p className="mb-5 mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
          No APK is needed on iPhone, iPad, or a computer. Install from a supported browser,
          or keep using the website. An internet connection is required for browsing, bookings, and payments.
        </p>
        <InstallAppButton />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="android-title" className="rounded-card border p-5 sm:p-6">
          <h2 id="android-title" className="text-lg font-semibold">Android phones &amp; tablets</h2>
          <ol className="my-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-text-muted">
            <li>Open this website in Chrome or another browser that supports installing web apps.</li>
            <li>Open the browser menu and choose <strong className="text-text">Install app</strong> or <strong className="text-text">Add to Home screen</strong>.</li>
          </ol>
          <p className="mb-4 text-sm text-text-muted">Prefer the Android package? A test APK is available below.</p>
          <a href="/downloads/mingalar-cinema.apk" download="MingalarCinema.apk" className="inline-flex min-h-11 items-center justify-center rounded-chip bg-brand-gradient px-5 py-3 text-sm font-medium text-white hover:brightness-95">
            Download Android test APK
          </a>
          <p className="mt-3 text-xs leading-relaxed text-text-muted">
            Android 7 or newer with an updated Android System WebView is required. This is a test build, not a Play Store release. Android may ask you to allow installation from your browser or file manager.
          </p>
        </section>

        <section aria-labelledby="apple-title" className="rounded-card border p-5 sm:p-6">
          <h2 id="apple-title" className="text-lg font-semibold">iPhone &amp; iPad</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-text-muted">
            <li>Open this website in <strong className="text-text">Safari</strong>.</li>
            <li>Tap <strong className="text-text">Share</strong> (the square with an upward arrow).</li>
            <li>Choose <strong className="text-text">Add to Home Screen</strong>, then tap <strong className="text-text">Add</strong>. If you see Open as Web App, leave it enabled.</li>
          </ol>
          <p className="mt-4 text-sm text-text-muted">Launch Mingalar Cinema from its home screen icon. Android APK files cannot be installed on iPhone or iPad.</p>
        </section>

        <section aria-labelledby="desktop-title" className="rounded-card border p-5 sm:p-6">
          <h2 id="desktop-title" className="text-lg font-semibold">Windows, Mac &amp; Chromebook</h2>
          <p className="mt-4 text-sm leading-relaxed text-text-muted">
            In Chrome or Edge, look for the install icon beside the address bar or the install option
            in the browser menu. On recent macOS versions, Safari also offers <strong className="text-text">File → Add to Dock</strong>.
          </p>
        </section>

        <section aria-labelledby="browser-title" className="rounded-card border p-5 sm:p-6">
          <h2 id="browser-title" className="text-lg font-semibold">Keep using your browser</h2>
          <p className="mt-4 text-sm leading-relaxed text-text-muted">
            Installation is optional. If your device does not offer it, bookmark the website and
            open it in an up-to-date browser. Installation options vary by browser and operating system.
          </p>
          <Link href="/movies" className="mt-4 inline-flex min-h-11 items-center rounded font-medium text-brand-red underline underline-offset-4">Browse movies</Link>
        </section>
      </div>
      <p className="mt-6 text-sm leading-relaxed text-text-muted">
        Each browser or app keeps its own sign-in session. Sign in again on another device to view your bookings.
      </p>
    </div>
  );
}
