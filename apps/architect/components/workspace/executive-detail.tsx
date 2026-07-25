"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Progressive disclosure for executive cards — summary first, evidence on request.
 */
export function ExecutiveDetail({
  summary,
  children,
  labelExpand = "View supporting detail",
  labelCollapse = "Hide detail",
  defaultOpen = false,
  className,
}: {
  summary?: ReactNode;
  children: ReactNode;
  labelExpand?: string;
  labelCollapse?: string;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={cn(className)}>
      {summary}
      <button
        type="button"
        className="mt-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 underline-offset-4 transition-colors hover:text-neutral-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? labelCollapse : labelExpand}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className={cn(
          "mt-4 border-t border-neutral-200/70 pt-4",
          !open && "hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}
