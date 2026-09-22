export default function Loading() {
  return (
    <div>
      <div className="skeleton aspect-[16/9] w-full sm:aspect-[21/9]" />
      <div className="mx-auto -mt-16 max-w-6xl px-4 sm:-mt-24">
        <div className="flex gap-4 sm:gap-6">
          <div className="skeleton aspect-[2/3] w-28 flex-shrink-0 rounded-card sm:w-40" />
          <div className="flex-1 pt-16 sm:pt-24">
            <div className="skeleton h-6 w-3/4 rounded" />
            <div className="skeleton mt-2 h-4 w-1/2 rounded" />
          </div>
        </div>
        <div className="mt-6 space-y-2">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-2/3 rounded" />
        </div>
      </div>
    </div>
  );
}
