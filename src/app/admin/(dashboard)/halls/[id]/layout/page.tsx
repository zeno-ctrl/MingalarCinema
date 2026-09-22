import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SeatLayoutEditor } from "@/components/admin/halls/SeatLayoutEditor";

export default async function HallLayoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hall = await prisma.hall.findUnique({
    where: { id },
    include: { seats: { orderBy: [{ row: "asc" }, { column: "asc" }] }, branch: true },
  });
  if (!hall) notFound();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">{hall.name} Seat Layout</h1>
      <p className="mb-6 text-sm text-text-muted">{hall.branch.nameEn}</p>
      <SeatLayoutEditor hallId={hall.id} rows={hall.rows} columns={hall.columns} initialSeats={hall.seats} />
    </div>
  );
}
