"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { useToast } from "@/components/admin/Toast";

type Branch = { id: string; nameEn: string };

export type MovieFormValues = {
  titleEn: string;
  titleMm: string;
  synopsisEn: string;
  synopsisMm: string;
  cast: string;
  director: string;
  genre: string;
  rating: "G" | "PG" | "PG13" | "R";
  runtimeMin: number;
  language: string;
  subtitles: string;
  formats: ("D2" | "D3" | "PREMIUM")[];
  posterUrl: string;
  bannerUrl: string;
  trailerUrl: string;
  releaseDate: string;
  status: "COMING_SOON" | "NOW_SHOWING" | "ENDED";
  featured: boolean;
  allBranches: boolean;
  branchIds: string[];
};

const DEFAULTS: MovieFormValues = {
  titleEn: "",
  titleMm: "",
  synopsisEn: "",
  synopsisMm: "",
  cast: "",
  director: "",
  genre: "",
  rating: "PG",
  runtimeMin: 120,
  language: "Burmese",
  subtitles: "",
  formats: ["D2"],
  posterUrl: "",
  bannerUrl: "",
  trailerUrl: "",
  releaseDate: new Date().toISOString().slice(0, 10),
  status: "COMING_SOON",
  featured: false,
  allBranches: true,
  branchIds: [],
};

export function MovieForm({
  movieId,
  initial,
  branches,
}: {
  movieId?: string;
  initial?: Partial<MovieFormValues>;
  branches: Branch[];
}) {
  const router = useRouter();
  const { show } = useToast();
  const [values, setValues] = useState<MovieFormValues>({ ...DEFAULTS, ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof MovieFormValues>(key: K, value: MovieFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...values,
      cast: values.cast.split(",").map((s) => s.trim()).filter(Boolean),
      genre: values.genre.split(",").map((s) => s.trim()).filter(Boolean),
    };

    const url = movieId ? `/api/admin/movies/${movieId}` : "/api/admin/movies";
    const res = await fetch(url, {
      method: movieId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Please check the form for errors.");
      return;
    }
    show(movieId ? "Movie updated" : "Movie created");
    router.push("/admin/movies");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title (English)">
          <Input value={values.titleEn} onChange={(e) => set("titleEn", e.target.value)} required />
        </Field>
        <Field label="Title (Burmese)">
          <Input value={values.titleMm} onChange={(e) => set("titleMm", e.target.value)} required />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Synopsis (English)">
          <textarea
            className="w-full rounded-chip border border-black/10 bg-bg p-3 text-sm dark:border-white/15"
            rows={4}
            value={values.synopsisEn}
            onChange={(e) => set("synopsisEn", e.target.value)}
            required
          />
        </Field>
        <Field label="Synopsis (Burmese)">
          <textarea
            className="w-full rounded-chip border border-black/10 bg-bg p-3 text-sm dark:border-white/15"
            rows={4}
            value={values.synopsisMm}
            onChange={(e) => set("synopsisMm", e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cast (comma-separated)">
          <Input value={values.cast} onChange={(e) => set("cast", e.target.value)} />
        </Field>
        <Field label="Director">
          <Input value={values.director} onChange={(e) => set("director", e.target.value)} required />
        </Field>
        <Field label="Genre (comma-separated)">
          <Input value={values.genre} onChange={(e) => set("genre", e.target.value)} />
        </Field>
        <Field label="Rating">
          <select
            className="w-full rounded-chip border border-black/10 bg-bg px-3 py-3 text-sm dark:border-white/15"
            value={values.rating}
            onChange={(e) => set("rating", e.target.value as MovieFormValues["rating"])}
          >
            {["G", "PG", "PG13", "R"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Runtime (minutes)">
          <Input
            type="number"
            value={values.runtimeMin}
            onChange={(e) => set("runtimeMin", Number(e.target.value))}
            required
          />
        </Field>
        <Field label="Language">
          <Input value={values.language} onChange={(e) => set("language", e.target.value)} required />
        </Field>
        <Field label="Subtitles">
          <Input value={values.subtitles} onChange={(e) => set("subtitles", e.target.value)} />
        </Field>
        <Field label="Release Date">
          <Input type="date" value={values.releaseDate} onChange={(e) => set("releaseDate", e.target.value)} required />
        </Field>
        <Field label="Status">
          <select
            className="w-full rounded-chip border border-black/10 bg-bg px-3 py-3 text-sm dark:border-white/15"
            value={values.status}
            onChange={(e) => set("status", e.target.value as MovieFormValues["status"])}
          >
            <option value="COMING_SOON">Coming Soon</option>
            <option value="NOW_SHOWING">Now Showing</option>
            <option value="ENDED">Ended</option>
          </select>
        </Field>
      </div>

      <Field label="Format">
        <div className="flex gap-4">
          {(["D2", "D3", "PREMIUM"] as const).map((f) => (
            <label key={f} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.formats.includes(f)}
                onChange={(e) =>
                  set("formats", e.target.checked ? [...values.formats, f] : values.formats.filter((x) => x !== f))
                }
              />
              {f === "D2" ? "2D" : f === "D3" ? "3D" : "Premium"}
            </label>
          ))}
        </div>
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.featured} onChange={(e) => set("featured", e.target.checked)} />
        Featured on home page
      </label>

      <ImageUploadField label="Poster" value={values.posterUrl} onChange={(v) => set("posterUrl", v)} />
      <ImageUploadField label="Banner" value={values.bannerUrl} onChange={(v) => set("bannerUrl", v)} />

      <Field label="Trailer URL (YouTube)">
        <Input value={values.trailerUrl} onChange={(e) => set("trailerUrl", e.target.value)} />
      </Field>

      <Field label="Branches">
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.allBranches} onChange={(e) => set("allBranches", e.target.checked)} />
          All branches
        </label>
        {!values.allBranches && (
          <div className="grid grid-cols-2 gap-2">
            {branches.map((b) => (
              <label key={b.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={values.branchIds.includes(b.id)}
                  onChange={(e) =>
                    set(
                      "branchIds",
                      e.target.checked ? [...values.branchIds, b.id] : values.branchIds.filter((x) => x !== b.id),
                    )
                  }
                />
                {b.nameEn}
              </label>
            ))}
          </div>
        )}
      </Field>

      <Button type="submit" loading={loading}>
        {movieId ? "Save Changes" : "Create Movie"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-text-muted">{label}</label>
      {children}
    </div>
  );
}
