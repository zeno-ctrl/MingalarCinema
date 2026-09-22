import { prisma } from "@/lib/db";
import { AuditLogTable } from "@/components/admin/audit/AuditLogTable";

export default async function AdminAuditLogPage() {
  const logs = await prisma.auditLog.findMany({
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Audit Log</h1>
      <AuditLogTable
        logs={logs.map((l) => ({
          id: l.id,
          actorName: l.actor.name,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          createdAt: l.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
