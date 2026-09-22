import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageRole } from "@/lib/auth-helpers";
import { InvitesManager } from "@/components/admin/invites/InvitesManager";

export default async function AdminInvitesPage() {
  const user = await requirePageRole("ADMIN");
  if (user.role !== "SUPER_ADMIN") redirect("/admin");

  const invites = await prisma.adminInvite.findMany({
    include: { invitedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Admin Invites</h1>
      <InvitesManager
        invites={invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          invitedByName: i.invitedBy.name,
          expiresAt: i.expiresAt.toISOString(),
          acceptedAt: i.acceptedAt?.toISOString() || null,
        }))}
      />
    </div>
  );
}
