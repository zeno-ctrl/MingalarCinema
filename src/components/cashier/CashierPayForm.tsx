"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatMMK } from "@/lib/utils";

export function CashierPayForm({ showtimeId, total, seatLabels }: { showtimeId: string; total: number; seatLabels: string[] }) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/cashier/create-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showtimeId, customerName, customerPhone, customerEmail }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      const message =
        typeof data.error === "string"
          ? data.error
          : Object.values(data.error?.fieldErrors ?? {})
              .flat()
              .join(" ") || "Something went wrong.";
      setError(message);
      return;
    }
    router.push(`/cashier/receipt/${data.reference}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
      <div className="rounded-card bg-bg p-4 shadow-card">
        <p className="text-sm text-text-muted">Seats: {seatLabels.join(", ")}</p>
        <p className="text-lg font-semibold">Total (cash): {formatMMK(total)}</p>
      </div>

      {error && (
        <div className="rounded-chip bg-error/10 px-4 py-3 text-sm text-error" role="alert">
          {error}
        </div>
      )}

      <Input placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
      <Input
        type="tel"
        placeholder="Customer phone (optional)"
        value={customerPhone}
        onChange={(e) => setCustomerPhone(e.target.value)}
      />
      <Input
        type="email"
        placeholder="Customer email (optional, for e-receipt)"
        value={customerEmail}
        onChange={(e) => setCustomerEmail(e.target.value)}
      />

      <Button type="submit" className="w-full" loading={loading} disabled={seatLabels.length === 0}>
        Complete Cash Sale
      </Button>
    </form>
  );
}
