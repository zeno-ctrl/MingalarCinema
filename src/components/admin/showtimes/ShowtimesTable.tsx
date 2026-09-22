"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

type ShowtimeRow = {
  id: string;
  movieTitle: string;
  branchName: string;
  hallName: string;
  startsAt: string;
  format: string;
};

export function ShowtimesTable({ showtimes }: { showtimes: ShowtimeRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { show } = useToast();

  async function handleDelete(s: ShowtimeRow) {
    const ok = await confirm({ title: `Delete this showtime?`, danger: true, confirmLabel: "Delete" });
    if (!ok) return;
    const res = await fetch(`/api/admin/showtimes/${s.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return show(data.error || "Failed to delete", "error");
    show("Showtime deleted");
    router.refresh();
  }

  const columns: Column<ShowtimeRow>[] = [
    { key: "movieTitle", header: "Movie", render: (s) => s.movieTitle, sortValue: (s) => s.movieTitle },
    { key: "branchName", header: "Branch", render: (s) => s.branchName, sortValue: (s) => s.branchName },
    { key: "hallName", header: "Hall", render: (s) => s.hallName },
    {
      key: "startsAt",
      header: "Starts At",
      render: (s) => new Date(s.startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
      sortValue: (s) => s.startsAt,
    },
    { key: "format", header: "Format", render: (s) => s.format },
  ];

  return (
    <DataTable
      columns={columns}
      rows={showtimes}
      searchFn={(s, q) => s.movieTitle.toLowerCase().includes(q) || s.branchName.toLowerCase().includes(q)}
      searchPlaceholder="Search showtimes..."
      pageSize={15}
      actions={(s) => (
        <div className="flex justify-end gap-3 text-sm">
          <Link href={`/admin/showtimes/${s.id}`} className="text-brand-red hover:underline">
            Edit
          </Link>
          <button onClick={() => handleDelete(s)} className="text-error hover:underline">
            Delete
          </button>
        </div>
      )}
    />
  );
}
