"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn, formatMMK } from "@/lib/utils";
import { PinchZoom } from "./PinchZoom";
import { useCountdown } from "./useCountdown";
import { MAX_SEATS_PER_BOOKING } from "@/lib/constants";

type SeatType = "STANDARD" | "VIP" | "COUPLE";
type SeatStatus = "AVAILABLE" | "TAKEN" | "HELD_BY_ME" | "HELD_BY_OTHER";

export type SeatMapSeat = {
  id: string;
  row: string;
  column: number;
  label: string;
  type: SeatType;
  isDisabled: boolean;
  isAisleAfter: boolean;
};

const TYPE_LABEL: Record<SeatType, string> = { STANDARD: "Standard", VIP: "VIP", COUPLE: "Couple" };

export function SeatMap({
  showtimeId,
  seats,
  initialStatuses,
  initialMySeatIds,
  initialHoldExpiresAt,
  prices,
  continueHref,
}: {
  showtimeId: string;
  seats: SeatMapSeat[];
  initialStatuses: Record<string, SeatStatus>;
  initialMySeatIds: string[];
  initialHoldExpiresAt: string | null;
  prices: Record<SeatType, number>;
  /** Where "Continue" navigates to. Defaults to the customer checkout pay step. */
  continueHref?: string;
}) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, SeatStatus>>(initialStatuses);
  const [mySeatIds, setMySeatIds] = useState<string[]>(initialMySeatIds);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(initialHoldExpiresAt);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiredMessage, setExpiredMessage] = useState(false);
  const busyRef = useRef(false);

  const seatById = useMemo(() => new Map(seats.map((s) => [s.id, s])), [seats]);

  const refreshStatus = useCallback(async () => {
    const res = await fetch(`/api/checkout/seat-status?showtimeId=${showtimeId}`);
    if (!res.ok) return;
    const data = await res.json();
    setStatuses(data.statuses);
    setMySeatIds(data.mySeatIds);
    setHoldExpiresAt(data.myHoldExpiresAt);
  }, [showtimeId]);

  useEffect(() => {
    const id = setInterval(refreshStatus, 5000);
    return () => clearInterval(id);
  }, [refreshStatus]);

  const countdown = useCountdown(holdExpiresAt, () => {
    setExpiredMessage(true);
    setMySeatIds([]);
    setHoldExpiresAt(null);
    refreshStatus();
  });

  async function toggleSeat(seat: SeatMapSeat) {
    if (seat.isDisabled || busyRef.current) return;
    const status = statuses[seat.id] ?? "AVAILABLE";
    if (status === "TAKEN" || status === "HELD_BY_OTHER") return;

    setError(null);
    setExpiredMessage(false);
    busyRef.current = true;
    setPending(seat.id);

    try {
      if (status === "HELD_BY_ME") {
        await fetch("/api/checkout/hold", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ showtimeId, seatId: seat.id }),
        });
        setStatuses((prev) => ({ ...prev, [seat.id]: "AVAILABLE" }));
        setMySeatIds((prev) => prev.filter((id) => id !== seat.id));
      } else {
        if (mySeatIds.length >= MAX_SEATS_PER_BOOKING) {
          setError(`You can select up to ${MAX_SEATS_PER_BOOKING} seats.`);
          return;
        }
        const res = await fetch("/api/checkout/hold", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ showtimeId, seatId: seat.id }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not select that seat.");
          await refreshStatus();
          return;
        }
        setStatuses((prev) => ({ ...prev, [seat.id]: "HELD_BY_ME" }));
        setMySeatIds((prev) => [...prev, seat.id]);
        setHoldExpiresAt(data.expiresAt);
      }
    } finally {
      busyRef.current = false;
      setPending(null);
    }
  }

  const rows = useMemo(() => {
    const byRow = new Map<string, SeatMapSeat[]>();
    for (const seat of seats) {
      if (!byRow.has(seat.row)) byRow.set(seat.row, []);
      byRow.get(seat.row)!.push(seat);
    }
    for (const list of byRow.values()) list.sort((a, b) => a.column - b.column);
    return Array.from(byRow.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [seats]);

  const total = mySeatIds.reduce((sum, id) => sum + (prices[seatById.get(id)?.type ?? "STANDARD"] ?? 0), 0);

  return (
    <div>
      <div className="mx-4 mb-4 rounded-card bg-bg p-3 text-center text-xs text-text-muted shadow-card">
        SCREEN
        <div className="mx-auto mt-1 h-1 w-4/5 rounded-full bg-gradient-to-r from-transparent via-text-muted/40 to-transparent" />
      </div>

      {expiredMessage && (
        <div className="mx-4 mb-3 rounded-chip bg-warning/15 px-4 py-2 text-sm text-warning">
          Your seat hold expired. Please select your seats again.
        </div>
      )}
      {error && (
        <div className="mx-4 mb-3 rounded-chip bg-error/10 px-4 py-2 text-sm text-error" role="alert">
          {error}
        </div>
      )}

      <PinchZoom>
        <div className="space-y-1.5 px-4 py-2">
          {rows.map(([row, rowSeats]) => (
            <div key={row} className="flex items-center justify-center gap-1.5">
              <span className="w-4 text-xs text-text-muted">{row}</span>
              {rowSeats.map((seat) => {
                const status = statuses[seat.id] ?? "AVAILABLE";
                return (
                  <div key={seat.id} className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleSeat(seat)}
                      disabled={seat.isDisabled || status === "TAKEN" || status === "HELD_BY_OTHER" || pending === seat.id}
                      aria-label={`Seat ${seat.label}, ${TYPE_LABEL[seat.type]}, ${status === "HELD_BY_ME" ? "selected" : status.toLowerCase()}`}
                      className={cn(
                        "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[10px] font-medium transition-colors sm:h-8 sm:w-8",
                        seat.type === "COUPLE" && "w-9 sm:w-10",
                        status === "AVAILABLE" &&
                          seat.type === "STANDARD" &&
                          "border-2 border-text-muted/40 text-text-muted hover:border-brand-red",
                        status === "AVAILABLE" &&
                          seat.type === "VIP" &&
                          "border-2 border-warning text-warning hover:bg-warning/10",
                        status === "AVAILABLE" &&
                          seat.type === "COUPLE" &&
                          "border-2 border-brand-crimson text-brand-crimson hover:bg-brand-crimson/10",
                        status === "HELD_BY_ME" && "bg-brand-gradient text-white",
                        (status === "TAKEN" || status === "HELD_BY_OTHER") &&
                          "cursor-not-allowed bg-black/10 text-transparent dark:bg-white/10",
                      )}
                    >
                      {status !== "TAKEN" && status !== "HELD_BY_OTHER" ? seat.column : ""}
                    </button>
                    {seat.isAisleAfter && <span className="w-3" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </PinchZoom>

      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 text-xs text-text-muted">
        <LegendItem className="border-2 border-text-muted/40" label="Available" />
        <LegendItem className="bg-brand-gradient" label="Selected" />
        <LegendItem className="bg-black/10 dark:bg-white/10" label="Taken" />
        <LegendItem className="border-2 border-warning" label="VIP" />
        <LegendItem className="border-2 border-brand-crimson" label="Couple" />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-bg p-4 shadow-card-hover dark:border-white/10">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div>
            <p className="text-sm text-text-muted">
              {mySeatIds.length} seat{mySeatIds.length !== 1 ? "s" : ""} selected
            </p>
            <p className="text-lg font-semibold">{formatMMK(total)}</p>
            {countdown && (
              <p className={cn("text-xs", countdown.minutes < 2 ? "text-error" : "text-text-muted")}>
                Held for {countdown.label}
              </p>
            )}
          </div>
          <button
            disabled={mySeatIds.length === 0}
            onClick={() => router.push(continueHref ?? `/checkout/pay?showtimeId=${showtimeId}`)}
            className="rounded-chip bg-brand-gradient px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-4 w-4 rounded", className)} />
      {label}
    </div>
  );
}
