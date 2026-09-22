"use client";

import { DataTable, type Column } from "@/components/admin/DataTable";

type LogRow = { id: string; actorName: string; action: string; entityType: string; entityId: string; createdAt: string };

export function AuditLogTable({ logs }: { logs: LogRow[] }) {
  const columns: Column<LogRow>[] = [
    {
      key: "createdAt",
      header: "When",
      render: (l) => new Date(l.createdAt).toLocaleString(),
      sortValue: (l) => l.createdAt,
    },
    { key: "actorName", header: "Actor", render: (l) => l.actorName, sortValue: (l) => l.actorName },
    { key: "action", header: "Action", render: (l) => l.action, sortValue: (l) => l.action },
    { key: "entityType", header: "Entity", render: (l) => `${l.entityType} (${l.entityId.slice(0, 8)})` },
  ];

  return (
    <DataTable
      columns={columns}
      rows={logs}
      searchFn={(l, q) => l.action.toLowerCase().includes(q) || l.actorName.toLowerCase().includes(q)}
      searchPlaceholder="Search by action or actor..."
      pageSize={20}
    />
  );
}
