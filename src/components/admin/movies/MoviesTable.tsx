"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

type MovieRow = {
  id: string;
  title: string;
  status: string;
  rating: string;
  releaseDate: string;
  featured: boolean;
};

export function MoviesTable({ movies }: { movies: MovieRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { show } = useToast();

  async function handleDelete(movie: MovieRow) {
    const ok = await confirm({
      title: `Delete "${movie.title}"?`,
      description: "This cannot be undone.",
      danger: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/movies/${movie.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      show(data.error || "Failed to delete", "error");
      return;
    }
    show("Movie deleted");
    router.refresh();
  }

  const columns: Column<MovieRow>[] = [
    { key: "title", header: "Title", render: (m) => m.title, sortValue: (m) => m.title },
    { key: "status", header: "Status", render: (m) => m.status, sortValue: (m) => m.status },
    { key: "rating", header: "Rating", render: (m) => m.rating },
    {
      key: "releaseDate",
      header: "Release Date",
      render: (m) => new Date(m.releaseDate).toLocaleDateString(),
      sortValue: (m) => m.releaseDate,
    },
    { key: "featured", header: "Featured", render: (m) => (m.featured ? "Yes" : "") },
  ];

  return (
    <DataTable
      columns={columns}
      rows={movies}
      searchFn={(m, q) => m.title.toLowerCase().includes(q)}
      searchPlaceholder="Search movies..."
      actions={(m) => (
        <div className="flex justify-end gap-3 text-sm">
          <Link href={`/admin/movies/${m.id}`} className="text-brand-red hover:underline">
            Edit
          </Link>
          <button onClick={() => handleDelete(m)} className="text-error hover:underline">
            Delete
          </button>
        </div>
      )}
    />
  );
}
