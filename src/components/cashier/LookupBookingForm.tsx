"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Preview = {
  reference: string;
  status: string;
  expiresAt: string | null;
  movieTitle: string;
  branchName: string;
  hallName: string;
  startsAt: string;
  seats: string[];
  total: number;
  totalFormatted: string;
};

export function LookupBookingForm() {
  const [reference, setReference] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    setPreview(null);
    setLoading(true);
    const res = await fetch(`/api/cashier/lookup?reference=${encodeURIComponent(reference)}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Not found.");
      return;
    }
    setPreview(data);
  }

  async function confirm() {
    if (!preview) return;
    setConfirming(true);
    setError(null);
    const res = await fetch("/api/cashier/confirm-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: preview.reference }),
    });
    const data = await res.json();
    setConfirming(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    setDone(data.reference);
    setPreview(null);
  }

  const isExpired = preview?.status === "PENDING" && preview.expiresAt && new Date(preview.expiresAt) < new Date();
  const canConfirm = preview?.status === "PENDING" && !isExpired;

  return (
    <div className="space-y-4">
      <form onSubmit={lookup} className="flex gap-2">
        <Input
          placeholder="Booking code (e.g. MC-1234-5678)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          required
        />
        <Button type="submit" loading={loading}>
          Look up
        </Button>
      </form>

      {error && (
        <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}

      {done && (
        <div className="rounded-chip bg-success/15 px-4 py-3 text-sm text-success">
          Payment collected for {done}. The ticket is now PAID — customer can show it at the door.
        </div>
      )}

      {preview && (
        <div className="rounded-card bg-bg p-4 shadow-card">
          <p className="font-medium">{preview.movieTitle}</p>
          <p className="text-sm text-text-muted">
            {preview.branchName} • {preview.hallName} • {new Date(preview.startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
          <p className="mt-2 text-sm text-text-muted">Seats: {preview.seats.join(", ")}</p>
          <p className="mt-1 text-lg font-semibold">{preview.totalFormatted}</p>
          <p className="mt-1 text-xs text-text-muted">Status: {preview.status}{isExpired ? " (expired)" : ""}</p>

          {canConfirm ? (
            <Button className="mt-4 w-full" loading={confirming} onClick={confirm}>
              Confirm Cash Payment
            </Button>
          ) : (
            <p className="mt-4 text-sm text-error">
              {preview.status === "PAID" || preview.status === "CHECKED_IN"
                ? "This booking is already paid."
                : "This booking can't be paid anymore (expired or cancelled)."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
