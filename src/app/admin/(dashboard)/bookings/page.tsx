"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { formatMMK } from "@/lib/utils";

type BookingRow = {
  id: string;
  reference: string;
  status: string;
  total: number;
  contactEmail: string;
  contactPhone: string | null;
  createdAt: string;
  showtime: { movie: { title: string }; branch: { nameEn: string }; startsAt: string };
  seats: unknown[];
};

export default function AdminBookingsPage() {
  const [query, setQuery] = useState("");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/bookings?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setBookings(data.bookings || []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Bookings</h1>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by reference, email, or phone..."
        className="mb-4 max-w-sm"
      />

      <div className="overflow-x-auto rounded-card border border-black/10 dark:border-white/10">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-bg-soft text-left text-xs uppercase text-text-muted">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Movie</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-black/5 dark:border-white/10">
                <td className="px-4 py-3">
                  <Link href={`/admin/bookings/${b.id}`} className="font-mono text-brand-red hover:underline">
                    {b.reference}
                  </Link>
                </td>
                <td className="px-4 py-3">{b.showtime.movie.title}</td>
                <td className="px-4 py-3">{b.showtime.branch.nameEn}</td>
                <td className="px-4 py-3">
                  {b.contactEmail}
                  {b.contactPhone ? ` • ${b.contactPhone}` : ""}
                </td>
                <td className="px-4 py-3">{b.status}</td>
                <td className="px-4 py-3">{formatMMK(b.total)}</td>
              </tr>
            ))}
            {!loading && bookings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
