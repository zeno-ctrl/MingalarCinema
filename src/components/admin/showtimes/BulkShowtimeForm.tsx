"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/admin/Toast";

type Movie = { id: string; titleEn: string; allBranches: boolean; branchIds: string[] };
type Branch = { id: string; nameEn: string };
type Hall = { id: string; name: string; branchId: string };

export function BulkShowtimeForm({ movies, branches, halls }: { movies: Movie[]; branches: Branch[]; halls: Hall[] }) {
  const router = useRouter();
  const { show } = useToast();
  const [movieId, setMovieId] = useState(movies[0]?.id || "");
  const [branchId, setBranchId] = useState("");
  const [hallId, setHallId] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10));
  const [times, setTimes] = useState("10:00, 13:00, 16:00, 19:00");
  const [format, setFormat] = useState<"D2" | "D3" | "PREMIUM">("D2");
  const [priceStandard, setPriceStandard] = useState(6000);
  const [priceVip, setPriceVip] = useState(9000);
  const [priceCouple, setPriceCouple] = useState(16000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number; total: number } | null>(null);

  const selectedMovie = movies.find((m) => m.id === movieId);
  const eligibleBranches = useMemo(
    () => (selectedMovie?.allBranches ? branches : branches.filter((b) => selectedMovie?.branchIds.includes(b.id))),
    [selectedMovie, branches],
  );
  const eligibleHalls = useMemo(() => halls.filter((h) => h.branchId === branchId), [halls, branchId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const timesList = times.split(",").map((t) => t.trim()).filter(Boolean);
    const res = await fetch("/api/admin/showtimes/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieId,
        branchId,
        hallId,
        startDate,
        endDate,
        times: timesList,
        format,
        priceStandard,
        priceVip,
        priceCouple,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Please check the form for errors.");
      return;
    }
    setResult(data);
    show(`Created ${data.created} showtimes (${data.skipped} skipped due to overlaps)`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      {error && <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      {result && (
        <div className="rounded-chip bg-success/10 px-4 py-3 text-sm text-success">
          Created {result.created} of {result.total} showtimes. {result.skipped} skipped due to scheduling conflicts.
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Movie</label>
        <select
          className="w-full rounded-chip border border-black/10 bg-bg px-3 py-3 text-sm dark:border-white/15"
          value={movieId}
          onChange={(e) => {
            setMovieId(e.target.value);
            setBranchId("");
            setHallId("");
          }}
        >
          {movies.map((m) => (
            <option key={m.id} value={m.id}>
              {m.titleEn}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Branch</label>
        <select
          className="w-full rounded-chip border border-black/10 bg-bg px-3 py-3 text-sm dark:border-white/15"
          value={branchId}
          onChange={(e) => {
            setBranchId(e.target.value);
            setHallId("");
          }}
          required
        >
          <option value="">Select a branch</option>
          {eligibleBranches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nameEn}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Hall</label>
        <select
          className="w-full rounded-chip border border-black/10 bg-bg px-3 py-3 text-sm dark:border-white/15"
          value={hallId}
          onChange={(e) => setHallId(e.target.value)}
          required
        >
          <option value="">Select a hall</option>
          {eligibleHalls.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Start Date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">End Date</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Times (comma-separated, 24h)</label>
        <Input value={times} onChange={(e) => setTimes(e.target.value)} placeholder="10:00, 13:00, 16:00" required />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Format</label>
        <select
          className="w-full rounded-chip border border-black/10 bg-bg px-3 py-3 text-sm dark:border-white/15"
          value={format}
          onChange={(e) => setFormat(e.target.value as typeof format)}
        >
          <option value="D2">2D</option>
          <option value="D3">3D</option>
          <option value="PREMIUM">Premium</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Standard (Ks)</label>
          <Input type="number" value={priceStandard} onChange={(e) => setPriceStandard(Number(e.target.value))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">VIP (Ks)</label>
          <Input type="number" value={priceVip} onChange={(e) => setPriceVip(Number(e.target.value))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Couple (Ks)</label>
          <Input type="number" value={priceCouple} onChange={(e) => setPriceCouple(Number(e.target.value))} />
        </div>
      </div>

      <Button type="submit" loading={loading}>
        Create Schedule
      </Button>
    </form>
  );
}
