"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const LAST_BRANCH_COOKIE = "mingalar_last_branch";

export function BranchChips({
  branches,
  selectedBranchId,
  basePath,
  selectedDate,
}: {
  branches: { id: string; slug: string; label: string }[];
  selectedBranchId: string | undefined;
  basePath: string;
  selectedDate: string;
}) {
  return (
    <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
      {branches.map((b) => (
        <Link
          key={b.id}
          href={`${basePath}?branch=${b.slug}&date=${selectedDate}`}
          scroll={false}
          aria-current={selectedBranchId === b.id ? "true" : undefined}
          onClick={() => {
            document.cookie = `${LAST_BRANCH_COOKIE}=${b.slug}; path=/; max-age=${60 * 60 * 24 * 180}; SameSite=Lax`;
          }}
          className={cn(
            "inline-flex min-h-11 flex-shrink-0 items-center rounded-chip px-4 py-2 text-sm font-medium",
            selectedBranchId === b.id ? "bg-brand-gradient text-white" : "bg-bg-soft text-text",
          )}
        >
          {b.label}
        </Link>
      ))}
    </div>
  );
}
