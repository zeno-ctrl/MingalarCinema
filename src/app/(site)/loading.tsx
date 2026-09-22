export default function Loading() {
  return (
    <div>
      <div className="skeleton aspect-[16/9] w-full sm:aspect-[21/9]" />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="skeleton mb-3 h-6 w-40 rounded" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-64 w-40 flex-shrink-0 rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
