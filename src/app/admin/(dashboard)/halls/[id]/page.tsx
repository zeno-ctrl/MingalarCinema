import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { HallForm } from "@/components/admin/halls/HallForm";

export default async function EditHallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [hall, branches] = await Promise.all([
    prisma.hall.findUnique({ where: { id } }),
    prisma.branch.findMany({ orderBy: { nameEn: "asc" } }),
  ]);
  if (!hall) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Edit Hall</h1>
      <HallForm
        hallId={hall.id}
        branches={branches}
        initial={{ branchId: hall.branchId, name: hall.name, rows: hall.rows, columns: hall.columns }}
      />
    </div>
  );
}
