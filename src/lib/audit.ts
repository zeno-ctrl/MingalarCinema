import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** Round-trips through JSON so Dates/etc. in Prisma model objects become
 * plain JSON-safe values before being stored in the Json column. */
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  return JSON.parse(JSON.stringify(value));
}

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
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      before: toJson(before),
      after: toJson(after),
    },
  });
}
