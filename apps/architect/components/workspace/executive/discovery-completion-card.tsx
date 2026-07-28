"use client";

import { Check, Clock3, PartyPopper, ShieldQuestion } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { DiscoveryCompletionStatus } from "@/lib/consulting-intelligence";

/**
 * Mission E — Discovery Complete / Incomplete ceremony.
 *
 * The client-facing verdict from `assessDiscoveryCompletion`: every field
 * here is rendered verbatim from that engine — this component computes
 * nothing and never shows a percentage or badge the engine did not produce.
 * "Complete" always carries the continuous-consulting note; this is a
 * milestone, never a "finished forever" claim.
 */
const STATE_STYLES: Record<
  DiscoveryCompletionStatus["state"],
  { surface: string; ink: string; iconRing: string }
> = {
  complete: {
    surface: "border-[var(--isalwa-tint-green-border)]/70 bg-[var(--isalwa-tint-green)]/40",
    ink: "text-[var(--isalwa-tint-green-ink)]",
    iconRing: "bg-white text-[var(--isalwa-tint-green-ink)] ring-[var(--isalwa-tint-green-border)]/80",
  },
  incomplete: {
    surface: "border-[var(--isalwa-tint-amber-border)]/70 bg-[var(--isalwa-tint-amber)]/35",
    ink: "text-[var(--isalwa-tint-amber-ink)]",
    iconRing: "bg-white text-[var(--isalwa-tint-amber-ink)] ring-[var(--isalwa-tint-amber-border)]/80",
  },
};

function CapabilityRow({
  capability,
  tone,
}: {
  capability: DiscoveryCompletionStatus["checklist"][number];
  tone: "done" | "open" | "untracked";
}) {
  const { t } = useTranslations();
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl bg-white/80 px-3.5 py-2.5 text-sm ring-1 ring-[var(--isalwa-mist)]/70">
      <div className="flex min-w-0 items-start gap-2">
        {tone === "done" ? (
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--isalwa-tint-green-ink)]" aria-hidden />
        ) : tone === "open" ? (
          <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--isalwa-tint-amber-ink)]" aria-hidden />
        ) : (
          <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--isalwa-slate)]/50" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="text-[var(--isalwa-kiln)]">{capability.label}</p>
          {tone === "open" && capability.risks[0] ? (
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--isalwa-slate)]/75">
              {capability.risks[0]}
            </p>
          ) : null}
        </div>
      </div>
      {tone === "done" ? (
        <span className="shrink-0 rounded-full bg-[var(--isalwa-tint-green)]/70 px-2 py-0.5 text-[11px] font-medium tabular-nums text-[var(--isalwa-tint-green-ink)]">
          {t("discoveryCompletion.confidenceSuffix", { confidence: capability.confidence })}
        </span>
      ) : tone === "open" && capability.estimatedRemainingMinutes > 0 ? (
        <span className="shrink-0 text-[11px] text-[var(--isalwa-slate)]/60">
          {t("discoveryCompletion.etaLabel", { minutes: capability.estimatedRemainingMinutes })}
        </span>
      ) : null}
    </li>
  );
}

export function DiscoveryCompletionCard({
  status,
  className,
}: {
  status: DiscoveryCompletionStatus;
  className?: string;
}) {
  const { t } = useTranslations();
  const style = STATE_STYLES[status.state];
  const Icon = status.state === "complete" ? PartyPopper : Clock3;

  return (
    <Card className={cn("border px-6 py-6 shadow-none", style.surface, className)}>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ring-1",
            style.iconRing,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <p className={cn("text-[11px] font-medium uppercase tracking-[0.16em]", style.ink)}>
          {status.stateLabel}
        </p>
      </div>

      <p className="architect-serif mt-3 text-2xl leading-tight text-[var(--isalwa-kiln)]">
        {status.title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {status.message}
      </p>

      {status.checklist.length > 0 ? (
        <div className="mt-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
            {t("discoveryCompletion.checklistLabel")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {status.checklist.map((capability) => (
              <CapabilityRow key={capability.id} capability={capability} tone="done" />
            ))}
          </ul>
        </div>
      ) : null}

      {status.missingCapabilities.length > 0 ? (
        <div className="mt-5 border-t border-[var(--isalwa-mist)]/60 pt-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
            {t("discoveryCompletion.missingLabel")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {status.missingCapabilities.map((capability) => (
              <CapabilityRow key={capability.id} capability={capability} tone="open" />
            ))}
          </ul>
        </div>
      ) : null}

      {status.notTrackedCapabilities.length > 0 ? (
        <div className="mt-5 border-t border-[var(--isalwa-mist)]/60 pt-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
            {t("discoveryCompletion.notTrackedLabel")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {status.notTrackedCapabilities.map((capability) => (
              <CapabilityRow key={capability.id} capability={capability} tone="untracked" />
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-5 border-t border-[var(--isalwa-mist)]/60 pt-4 text-xs leading-relaxed text-[var(--isalwa-slate)]/75">
        {status.continuityNote}
      </p>
    </Card>
  );
}
