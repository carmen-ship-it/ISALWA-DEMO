"use client";

import { Check, Fingerprint, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  CapabilityDigitalTwinReport,
  CapabilityTwin,
} from "@/lib/discovery-agent/capabilities";
import { confidenceBand, confidenceBandLabelEs } from "@/lib/explanations/confidence";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Capability Digital Twin — client surface.
 *
 * Ten business capabilities, each with what we know, what we don't, an
 * honest confidence band and a concrete way to raise it. Every field is
 * rendered verbatim from `lib/discovery-agent/capabilities.ts` — this
 * component computes nothing. The badge reuses the same `confidenceBand`
 * thresholds already used elsewhere (`lib/explanations/confidence.ts`) to
 * turn the raw 0–100 into Alta/Media/Baja/Emergente — never a bare "x/100"
 * a client has no way to judge on its own.
 */
function confidenceBadge(capability: CapabilityTwin, notEnoughLabel: string, notMeasuredLabel: string) {
  if (!capability.measured) {
    return { text: notMeasuredLabel, tone: "muted" as const };
  }
  if (!capability.hasEvidence) {
    return { text: notEnoughLabel, tone: "muted" as const };
  }
  return {
    text: confidenceBandLabelEs(confidenceBand(capability.confidence)),
    tone: "value" as const,
  };
}

function CapabilityCard({ capability }: { capability: CapabilityTwin }) {
  const { t } = useTranslations();
  const badge = confidenceBadge(
    capability,
    t("capabilityTwin.noEvidence"),
    t("capabilityTwin.notMeasured"),
  );

  return (
    <li className="rounded-2xl border border-[var(--isalwa-mist)]/70 bg-white/85 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{capability.label}</p>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums",
            badge.tone === "value"
              ? "bg-[var(--isalwa-tint-blue)]/70 text-[var(--isalwa-tint-blue-ink)]"
              : "bg-[var(--isalwa-mist)]/60 text-[var(--isalwa-slate)]/70",
          )}
        >
          {badge.text}
        </span>
      </div>

      <div className="mt-3 space-y-2.5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
            {t("capabilityTwin.knownLabel")}
          </p>
          {capability.known.length > 0 ? (
            <ul className="mt-1.5 space-y-1">
              {capability.known.map((item, index) => (
                <li
                  key={`${capability.id}_known_${index}`}
                  className="flex items-start gap-1.5 text-xs leading-relaxed text-[var(--isalwa-slate)]/85"
                >
                  <Check
                    className="mt-0.5 h-3 w-3 shrink-0 text-[var(--isalwa-tint-green-ink)]"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-xs text-[var(--isalwa-slate)]/60">
              {t("capabilityTwin.emptyKnown")}
            </p>
          )}
        </div>

        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
            {t("capabilityTwin.unknownLabel")}
          </p>
          {capability.unknown.length > 0 ? (
            <ul className="mt-1.5 space-y-1">
              {capability.unknown.map((item, index) => (
                <li
                  key={`${capability.id}_unknown_${index}`}
                  className="flex items-start gap-1.5 text-xs leading-relaxed text-[var(--isalwa-slate)]/85"
                >
                  <X
                    className="mt-0.5 h-3 w-3 shrink-0 text-[var(--isalwa-tint-red-ink)]"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-xs text-[var(--isalwa-slate)]/60">
              {t("capabilityTwin.emptyUnknown")}
            </p>
          )}
        </div>
      </div>

      {capability.whyLow ? (
        <p className="mt-3 border-t border-[var(--isalwa-mist)]/50 pt-2.5 text-xs leading-relaxed text-[var(--isalwa-slate)]/80">
          <span className="font-medium text-[var(--isalwa-kiln)]">
            {t("capabilityTwin.whyLowLabel")}:{" "}
          </span>
          {capability.whyLow}
        </p>
      ) : null}

      {capability.howToRaise.length > 0 ? (
        <div className="mt-2 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--isalwa-glaze-deep)]">
            {t("capabilityTwin.howToRaiseLabel")}
          </p>
          {capability.howToRaise.map((line, index) => (
            <p
              key={`${capability.id}_raise_${index}`}
              className="text-xs leading-relaxed text-[var(--isalwa-slate)]/85"
            >
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </li>
  );
}

export function CapabilityDigitalTwinPanel({
  report,
}: {
  report: CapabilityDigitalTwinReport;
}) {
  const { t } = useTranslations();
  const hasAnyEvidence = report.capabilities.some((capability) => capability.hasEvidence);

  return (
    <div>
      <p className="text-sm leading-relaxed text-[var(--isalwa-kiln)]">{report.headline}</p>

      {!hasAnyEvidence ? (
        <EmptyState
          tone="health"
          icon={Fingerprint}
          title={t("capabilityTwin.emptyStateTitle")}
          whyItMatters={t("capabilityTwin.emptyStateWhy")}
          className="mt-4"
        />
      ) : null}

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {report.capabilities.map((capability) => (
          <CapabilityCard key={capability.id} capability={capability} />
        ))}
      </ul>
    </div>
  );
}
