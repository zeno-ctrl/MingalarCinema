import Link from "next/link";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-soft">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-bg dark:border-white/10">
        <div className="mx-auto flex max-w-2xl items-center px-4 py-3">
          <Link href="/" className="text-lg font-extrabold text-brand-red">
            Mingalar Cinema
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 pb-28">{children}</main>
    </div>
  );
}
