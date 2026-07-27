"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Progressive disclosure for executive cards — summary first, evidence on request.
 */
export function ExecutiveDetail({
  summary,
  children,
  labelExpand,
  labelCollapse,
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
  const { t } = useTranslations();
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const resolvedExpand = labelExpand ?? t("executiveDetail.expand");
  const resolvedCollapse = labelCollapse ?? t("executiveDetail.collapse");

  return (
    <div className={cn(className)}>
      {summary}
      <button
        type="button"
        className="mt-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/80 underline-offset-4 transition-colors hover:text-[var(--isalwa-slate)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--isalwa-glaze)]/45 focus-visible:ring-offset-2"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? resolvedCollapse : resolvedExpand}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className={cn(
          "mt-4 border-t border-[var(--isalwa-mist)]/70 pt-4",
          !open && "hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}
