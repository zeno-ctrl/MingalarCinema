"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/admin/Toast";
import { cn } from "@/lib/utils";

type SeatType = "STANDARD" | "VIP" | "COUPLE";
type SeatState = { type: SeatType; isDisabled: boolean };

const CYCLE: SeatType[] = ["STANDARD", "VIP", "COUPLE"];

const TYPE_CLASSES: Record<SeatType, string> = {
  STANDARD: "border-text-muted/40 text-text-muted",
  VIP: "border-warning text-warning",
  COUPLE: "border-brand-crimson text-brand-crimson",
};

export function SeatLayoutEditor({
  hallId,
  rows,
  columns,
  initialSeats,
}: {
  hallId: string;
  rows: number;
  columns: number;
  initialSeats: { row: string; column: number; type: SeatType; isDisabled: boolean; isAisleAfter: boolean }[];
}) {
  const router = useRouter();
  const { show } = useToast();
  const rowLetters = useMemo(() => "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, rows).split(""), [rows]);

  const [grid, setGrid] = useState<Map<string, SeatState>>(
    () => new Map(initialSeats.map((s) => [`${s.row}-${s.column}`, { type: s.type, isDisabled: s.isDisabled }])),
  );
  const [aisleColumns, setAisleColumns] = useState<Set<number>>(
    () => new Set(initialSeats.filter((s) => s.isAisleAfter).map((s) => s.column)),
  );
  const [saving, setSaving] = useState(false);

  function cycleSeat(row: string, col: number) {
    const key = `${row}-${col}`;
    setGrid((prev) => {
      const next = new Map(prev);
      const current = next.get(key) ?? { type: "STANDARD" as SeatType, isDisabled: false };
      if (current.isDisabled) {
        next.set(key, { type: "STANDARD", isDisabled: false });
      } else {
        const idx = CYCLE.indexOf(current.type);
        if (idx === CYCLE.length - 1) {
          next.set(key, { type: "STANDARD", isDisabled: true });
        } else {
          next.set(key, { type: CYCLE[idx + 1], isDisabled: false });
        }
      }
      return next;
    });
  }

  function toggleAisle(col: number) {
    setAisleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    const seats = rowLetters.flatMap((row) =>
      Array.from({ length: columns }, (_, i) => i + 1).map((col) => {
        const state = grid.get(`${row}-${col}`) ?? { type: "STANDARD" as SeatType, isDisabled: false };
        return { row, column: col, type: state.type, isDisabled: state.isDisabled, isAisleAfter: aisleColumns.has(col) };
      }),
    );
    const res = await fetch(`/api/admin/halls/${hallId}/seats`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seats }),
    });
    setSaving(false);
    if (!res.ok) {
      show("Failed to save layout", "error");
      return;
    }
    show("Seat layout saved");
    router.refresh();
  }

  return (
    <div>
      <p className="mb-4 text-sm text-text-muted">
        Click a seat to cycle Standard → VIP → Couple → Disabled. Click a column marker below to toggle an aisle gap
        after that column.
      </p>

      <div className="mb-2 flex justify-center gap-1 pl-6">
        {Array.from({ length: columns }, (_, i) => i + 1).map((col) => (
          <button
            key={col}
            onClick={() => toggleAisle(col)}
            className={cn(
              "h-3 w-7 rounded-sm text-[8px]",
              aisleColumns.has(col) ? "bg-brand-red" : "bg-black/10 dark:bg-white/10",
            )}
            title={`Toggle aisle after column ${col}`}
          />
        ))}
      </div>

      <div className="space-y-1.5 overflow-x-auto">
        {rowLetters.map((row) => (
          <div key={row} className="flex items-center justify-center gap-1">
            <span className="w-4 text-xs text-text-muted">{row}</span>
            {Array.from({ length: columns }, (_, i) => i + 1).map((col) => {
              const state = grid.get(`${row}-${col}`) ?? { type: "STANDARD" as SeatType, isDisabled: false };
              return (
                <span key={col} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => cycleSeat(row, col)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md border-2 text-[10px] font-medium",
                      state.isDisabled ? "border-transparent bg-black/10 dark:bg-white/10" : TYPE_CLASSES[state.type],
                    )}
                  >
                    {state.isDisabled ? "×" : col}
                  </button>
                  {aisleColumns.has(col) && <span className="w-3" />}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center gap-4 text-xs text-text-muted">
        <Legend className="border-text-muted/40" label="Standard" />
        <Legend className="border-warning" label="VIP" />
        <Legend className="border-brand-crimson" label="Couple" />
        <Legend className="bg-black/10 dark:bg-white/10 border-transparent" label="Disabled" />
      </div>

      <div className="mt-6 text-center">
        <Button onClick={handleSave} loading={saving}>
          Save Layout
        </Button>
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-4 w-4 rounded border-2", className)} />
      {label}
    </div>
  );
}
