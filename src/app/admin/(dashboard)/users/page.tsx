"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isDisabled: boolean;
  createdAt: string;
  _count: { bookings: number };
};

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    const id = setTimeout(async () => {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setUsers(data.users || []);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Users</h1>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, or phone..." className="mb-4 max-w-sm" />

      <div className="overflow-x-auto rounded-card border border-black/10 dark:border-white/10">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-bg-soft text-left text-xs uppercase text-text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Bookings</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-black/5 dark:border-white/10">
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${u.id}`} className="text-brand-red hover:underline">
                    {u.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">{u._count.bookings}</td>
                <td className="px-4 py-3">{u.isDisabled ? "Disabled" : "Active"}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
