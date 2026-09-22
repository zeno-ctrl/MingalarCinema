import Link from "next/link";
import { prisma } from "@/lib/db";
import { BranchesTable } from "@/components/admin/branches/BranchesTable";

export default async function AdminBranchesPage() {
  const branches = await prisma.branch.findMany({ orderBy: { nameEn: "asc" } });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Branches</h1>
        <Link href="/admin/branches/new" className="rounded-chip bg-brand-gradient px-4 py-2 text-sm font-medium text-white">
          + Add Branch
        </Link>
      </div>
      <BranchesTable
        branches={branches.map((b) => ({ id: b.id, nameEn: b.nameEn, phone: b.phone, isActive: b.isActive }))}
      />
    </div>
  );
}
