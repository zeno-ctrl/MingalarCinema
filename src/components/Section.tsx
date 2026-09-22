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
    <section className="py-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {seeAllHref && (
          <Link href={seeAllHref} className="text-sm font-medium text-brand-red hover:underline">
            {seeAllLabel}
          </Link>
        )}
      </div>
      <div className="mx-auto mt-3 flex max-w-6xl gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}
