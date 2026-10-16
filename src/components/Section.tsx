import Link from "next/link";

export function Section({
  title,
  seeAllHref,
  seeAllLabel = "See All",
  children,
}: {
  title: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="py-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {seeAllHref && (
          <Link href={seeAllHref} aria-label={`${seeAllLabel}: ${title}`} className="inline-flex min-h-11 items-center text-sm font-medium text-brand-red hover:underline">
            {seeAllLabel}
          </Link>
        )}
      </div>
      <div tabIndex={0} role="region" aria-label={title} className="mx-auto mt-3 flex max-w-6xl snap-x snap-proximity gap-3 overflow-x-auto px-4 pb-3">
        {children}
      </div>
    </section>
  );
}
