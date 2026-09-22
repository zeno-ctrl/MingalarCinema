import Link from "next/link";
import { prisma } from "@/lib/db";
import { HallsTable } from "@/components/admin/halls/HallsTable";

export default async function AdminHallsPage() {
  const halls = await prisma.hall.findMany({ include: { branch: true }, orderBy: { name: "asc" } });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Halls</h1>
        <Link href="/admin/halls/new" className="rounded-chip bg-brand-gradient px-4 py-2 text-sm font-medium text-white">
          + Add Hall
        </Link>
      </div>
      <HallsTable
        halls={halls.map((h) => ({
          id: h.id,
          name: h.name,
          branchName: h.branch.nameEn,
          rows: h.rows,
          columns: h.columns,
        }))}
      />
    </div>
  );
}
