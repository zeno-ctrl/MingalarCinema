import { prisma } from "@/lib/db";

export function getActiveBranches() {
  return prisma.branch.findMany({ where: { isActive: true }, orderBy: { nameEn: "asc" } });
}

export function getBranchBySlug(slug: string) {
  return prisma.branch.findUnique({
    where: { slug },
    include: { halls: true },
  });
}
