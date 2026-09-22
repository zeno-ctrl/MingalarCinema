import { prisma } from "@/lib/db";
import { HallForm } from "@/components/admin/halls/HallForm";

export default async function NewHallPage() {
  const branches = await prisma.branch.findMany({ orderBy: { nameEn: "asc" } });
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Add Hall</h1>
      <HallForm branches={branches} />
    </div>
  );
}
