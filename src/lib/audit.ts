import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function recordAudit({
  actorId,
  action,
  entityType,
  entityId,
  before,
  after,
}: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      before: before ?? undefined,
      after: after ?? undefined,
    },
  });
}
