"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Progressive disclosure for executive cards — summary first, evidence on request.
 * Mission 31: expand control is an obvious button, never a tiny text link.
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
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3 gap-1.5"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? resolvedCollapse : resolvedExpand}
        {!open ? <ArrowRight className="h-3.5 w-3.5" aria-hidden /> : null}
      </Button>
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
