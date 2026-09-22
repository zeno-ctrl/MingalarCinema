"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/admin/Toast";

type Movie = { id: string; titleEn: string; allBranches: boolean; branchIds: string[] };
type Branch = { id: string; nameEn: string };
type Hall = { id: string; name: string; branchId: string };

export function ShowtimeForm({
  showtimeId,
  movies,
  branches,
  halls,
  initial,
}: {
  showtimeId?: string;
  movies: Movie[];
  branches: Branch[];
  halls: Hall[];
  initial?: {
    movieId: string;
    branchId: string;
    hallId: string;
    startsAt: string;
    format: "D2" | "D3" | "PREMIUM";
    priceStandard: number;
    priceVip: number;
    priceCouple: number;
  };
}) {
  const router = useRouter();
  const { show } = useToast();
  const [movieId, setMovieId] = useState(initial?.movieId || movies[0]?.id || "");
  const [branchId, setBranchId] = useState(initial?.branchId || "");
  const [hallId, setHallId] = useState(initial?.hallId || "");
  const [startsAt, setStartsAt] = useState(initial?.startsAt.slice(0, 16) || "");
  const [format, setFormat] = useState<"D2" | "D3" | "PREMIUM">(initial?.format || "D2");
  const [priceStandard, setPriceStandard] = useState(initial?.priceStandard ?? 6000);
  const [priceVip, setPriceVip] = useState(initial?.priceVip ?? 9000);
  const [priceCouple, setPriceCouple] = useState(initial?.priceCouple ?? 16000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const url = showtimeId ? `/api/admin/showtimes/${showtimeId}` : "/api/admin/showtimes";
    const res = await fetch(url, {
      method: showtimeId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId, branchId, hallId, startsAt, format, priceStandard, priceVip, priceCouple }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Please check the form for errors.");
      return;
    }
    show(showtimeId ? "Showtime updated" : "Showtime created");
    router.push("/admin/showtimes");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      {error && <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

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

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Starts At</label>
        <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
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
        {showtimeId ? "Save Changes" : "Create Showtime"}
      </Button>
    </form>
  );
}
