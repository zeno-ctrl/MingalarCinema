"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const LAST_BRANCH_COOKIE = "cinetown_last_branch";

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
    <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {branches.map((b) => (
        <Link
          key={b.id}
          href={`${basePath}?branch=${b.slug}&date=${selectedDate}`}
          scroll={false}
          onClick={() => {
            document.cookie = `${LAST_BRANCH_COOKIE}=${b.slug}; path=/; max-age=${60 * 60 * 24 * 180}; SameSite=Lax`;
          }}
          className={cn(
            "flex-shrink-0 rounded-chip px-4 py-2 text-sm font-medium",
            selectedBranchId === b.id ? "bg-brand-gradient text-white" : "bg-bg-soft text-text",
          )}
        >
          {b.label}
        </Link>
      ))}
    </div>
  );
}
