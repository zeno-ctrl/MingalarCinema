import { getDashboardSummary } from "@/lib/queries/admin-dashboard";
import { StatCard } from "@/components/admin/StatCard";
import { BarChart } from "@/components/admin/BarChart";
import { formatMMK } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const { todaySales, todayTickets, revenueByBranch, revenueByMovie, dailySeries, occupancy } =
    await getDashboardSummary();

  const last7 = dailySeries.slice(-7);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Today's Sales" value={formatMMK(todaySales)} />
        <StatCard label="Tickets Sold Today" value={String(todayTickets)} />
        <StatCard label="Revenue (30d)" value={formatMMK(dailySeries.reduce((s, d) => s + d.revenue, 0))} />
        <StatCard label="Branches Active" value={String(revenueByBranch.length)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-card bg-bg p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-text-muted">Revenue — Last 7 Days</h2>
          <BarChart data={last7.map((d) => ({ label: d.date.slice(5), value: d.revenue }))} />
          <div className="mt-1 flex justify-between text-[10px] text-text-muted">
            {last7.map((d) => (
              <span key={d.date}>{d.date.slice(5)}</span>
            ))}
          </div>
        </div>
        <div className="rounded-card bg-bg p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-text-muted">Revenue — Last 30 Days</h2>
          <BarChart data={dailySeries.map((d) => ({ label: d.date, value: d.revenue }))} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-card bg-bg p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-text-muted">Revenue by Branch (30d)</h2>
          <ul className="space-y-2 text-sm">
            {revenueByBranch.map((r) => (
              <li key={r.name} className="flex justify-between">
                <span>{r.name}</span>
                <span className="font-medium">{formatMMK(r.revenue)}</span>
              </li>
            ))}
            {revenueByBranch.length === 0 && <li className="text-text-muted">No revenue yet.</li>}
          </ul>
        </div>
        <div className="rounded-card bg-bg p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-text-muted">Revenue by Movie (30d)</h2>
          <ul className="space-y-2 text-sm">
            {revenueByMovie.map((r) => (
              <li key={r.name} className="flex justify-between">
                <span>{r.name}</span>
                <span className="font-medium">{formatMMK(r.revenue)}</span>
              </li>
            ))}
            {revenueByMovie.length === 0 && <li className="text-text-muted">No revenue yet.</li>}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-card bg-bg p-4 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-text-muted">Occupancy — Next 24 Hours</h2>
        <div className="space-y-2">
          {occupancy.map((o) => (
            <div key={o.id} className="flex items-center gap-3 text-sm">
              <span className="w-40 flex-shrink-0 truncate">{o.movieTitle}</span>
              <span className="w-28 flex-shrink-0 truncate text-text-muted">{o.branchName}</span>
              <span className="w-16 flex-shrink-0 text-text-muted">
                {o.startsAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-soft">
                <div className="h-full bg-brand-gradient" style={{ width: `${o.occupancyPct}%` }} />
              </div>
              <span className="w-12 flex-shrink-0 text-right text-text-muted">{o.occupancyPct}%</span>
            </div>
          ))}
          {occupancy.length === 0 && <p className="text-sm text-text-muted">No showtimes in the next 24 hours.</p>}
        </div>
      </div>
    </div>
  );
}
