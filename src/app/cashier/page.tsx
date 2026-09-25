import Link from "next/link";
import { getActiveBranches } from "@/lib/queries/branches";
import { getShowtimesForBranch, todayStr } from "@/lib/queries/showtimes";
import { formatMMK } from "@/lib/utils";

export default async function CashierHomePage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; date?: string }>;
}) {
  const { branchId, date } = await searchParams;
  const branches = await getActiveBranches();
  const selectedDate = date || todayStr();
  const showtimes = branchId ? await getShowtimesForBranch(branchId, selectedDate) : [];

  return (
    <div className="space-y-6 px-4 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Sell a ticket</h1>
          <p className="text-sm text-text-muted">Pick a branch and date to find a showtime.</p>
        </div>
        <Link
          href="/cashier/lookup"
          className="flex-shrink-0 rounded-chip bg-bg-soft px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
        >
          Pay a reservation
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Branch</label>
          <select
            name="branchId"
            defaultValue={branchId || ""}
            className="rounded-chip border border-black/10 bg-bg px-3 py-2 text-sm dark:border-white/15"
            required
          >
            <option value="" disabled>
              Select a branch
            </option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nameEn}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Date</label>
          <input
            type="date"
            name="date"
            defaultValue={selectedDate}
            className="rounded-chip border border-black/10 bg-bg px-3 py-2 text-sm dark:border-white/15"
          />
        </div>
        <button type="submit" className="rounded-chip bg-brand-gradient px-5 py-2 text-sm font-semibold text-white">
          Search
        </button>
      </form>

      {branchId && (
        <div className="space-y-3">
          {showtimes.length === 0 && (
            <p className="text-sm text-text-muted">No showtimes for this branch on {selectedDate}.</p>
          )}
          {showtimes.map((s) => (
            <Link
              key={s.id}
              href={`/cashier/seats?showtimeId=${s.id}`}
              className="flex items-center justify-between rounded-card bg-bg p-4 shadow-card transition-shadow hover:shadow-card-hover"
            >
              <div>
                <p className="font-medium">{s.movie.title}</p>
                <p className="text-sm text-text-muted">
                  {s.hall.name} • {s.startsAt.toLocaleString("en-US", { timeStyle: "short" })} • {s.format}
                </p>
              </div>
              <p className="text-sm font-semibold text-brand-red">From {formatMMK(s.priceStandard)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
