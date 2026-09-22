"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/admin/Toast";

type Branch = { id: string; nameEn: string };

export function HallForm({
  hallId,
  branches,
  initial,
}: {
  hallId?: string;
  branches: Branch[];
  initial?: { branchId: string; name: string; rows: number; columns: number };
}) {
  const router = useRouter();
  const { show } = useToast();
  const [branchId, setBranchId] = useState(initial?.branchId || branches[0]?.id || "");
  const [name, setName] = useState(initial?.name || "");
  const [rows, setRows] = useState(initial?.rows || 8);
  const [columns, setColumns] = useState(initial?.columns || 12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const url = hallId ? `/api/admin/halls/${hallId}` : "/api/admin/halls";
    const res = await fetch(url, {
      method: hallId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId, name, rows, columns }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Please check the form for errors.");
      return;
    }
    show(hallId ? "Hall updated" : "Hall created");
    router.push("/admin/halls");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      {error && <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Branch</label>
        <select
          className="w-full rounded-chip border border-black/10 bg-bg px-3 py-3 text-sm dark:border-white/15"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nameEn}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-muted">Hall Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Rows</label>
          <Input type="number" min={1} max={26} value={rows} onChange={(e) => setRows(Number(e.target.value))} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-muted">Columns</label>
          <Input
            type="number"
            min={1}
            max={40}
            value={columns}
            onChange={(e) => setColumns(Number(e.target.value))}
            required
          />
        </div>
      </div>
      {hallId && (
        <p className="text-xs text-text-muted">
          Increasing rows/columns adds new Standard seats. Decreasing removes seats — this is blocked if any of them
          already have bookings.
        </p>
      )}

      <Button type="submit" loading={loading}>
        {hallId ? "Save Changes" : "Create Hall"}
      </Button>
    </form>
  );
}
