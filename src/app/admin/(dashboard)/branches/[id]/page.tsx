import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BranchForm } from "@/components/admin/branches/BranchForm";

export default async function EditBranchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await prisma.branch.findUnique({ where: { id } });
  if (!branch) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Edit Branch</h1>
      <BranchForm
        branchId={branch.id}
        initial={{
          nameEn: branch.nameEn,
          nameMm: branch.nameMm,
          addressEn: branch.addressEn,
          addressMm: branch.addressMm,
          phone: branch.phone,
          latitude: branch.latitude?.toString() || "",
          longitude: branch.longitude?.toString() || "",
          openingHours: branch.openingHours,
          facilities: branch.facilities.join(", "),
          isActive: branch.isActive,
        }}
      />
    </div>
  );
}
