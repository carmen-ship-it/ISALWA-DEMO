"use client";

import Link from "next/link";
import { ArrowRight, Check, Clock3, PartyPopper, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { capabilityDimensions } from "@/lib/discovery-agent/capabilities";
import { dimensionToStage } from "@/lib/discovery/stages";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { DiscoveryCompletionStatus } from "@/lib/consulting-intelligence";

/**
 * Mission E — Discovery Complete / Incomplete ceremony.
 * Mission 20 — click-through into the guided interview for a missing
 * capability, reusing free stage navigation (`switchToStage`) instead of a
 * second "resume" mechanism. `capabilityDimensions` + `dimensionToStage`
 * are the same lookups the Capability Digital Twin and the guided stage
 * stepper already own — this only chains them into a deep link.
 *
 * The client-facing verdict from `assessDiscoveryCompletion`: every field
 * here is rendered verbatim from that engine — this component computes
 * nothing and never shows a percentage or badge the engine did not produce.
 * "Complete" always carries the continuous-consulting note; this is a
 * milestone, never a "finished forever" claim.
 */

/**
 * Missing capability → guided interview deep link, `null` when no discovery
 * dimension backs it. Exported (Mission 20 — Executive Daily Brief) so the
 * brief's own "Next Milestones" strip reuses this exact lookup instead of a
 * second copy — same rule as `capabilityDimensions()` + `dimensionToStage()`
 * themselves.
 */
export function capabilityInterviewHref(
  workspaceId: string,
  capabilityId: DiscoveryCompletionStatus["missingCapabilities"][number]["id"],
): string | null {
  const dimension = capabilityDimensions(capabilityId)[0];
  if (!dimension) return null;
  const stage = dimensionToStage(dimension);
  return `/discovery?workspaceId=${workspaceId}&stage=${stage}`;
}

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
  interviewHref,
}: {
  capability: DiscoveryCompletionStatus["checklist"][number];
  tone: "done" | "open" | "untracked";
  /** Mission 20 — when set, this open capability's row jumps into the guided interview, focused. */
  interviewHref?: string | null;
}) {
  const { t } = useTranslations();
  const icon =
    tone === "done" ? (
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--isalwa-tint-green-ink)]" aria-hidden />
    ) : tone === "open" ? (
      <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--isalwa-tint-amber-ink)]" aria-hidden />
    ) : (
      <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--isalwa-slate)]/50" aria-hidden />
    );

  const trailing =
    tone === "done" ? (
      <span className="shrink-0 rounded-full bg-[var(--isalwa-tint-green)]/70 px-2 py-0.5 text-[11px] font-medium tabular-nums text-[var(--isalwa-tint-green-ink)]">
        {t("discoveryCompletion.confidenceSuffix", { confidence: capability.confidence })}
      </span>
    ) : tone === "open" && capability.estimatedRemainingMinutes > 0 ? (
      <span className="shrink-0 text-[11px] text-[var(--isalwa-slate)]/60">
        {t("discoveryCompletion.etaLabel", { minutes: capability.estimatedRemainingMinutes })}
      </span>
    ) : null;

  const body = (
    <>
      <div className="flex min-w-0 items-start gap-2">
        {icon}
        <div className="min-w-0">
          <p className="text-[var(--isalwa-kiln)]">{capability.label}</p>
          {tone === "open" && capability.risks[0] ? (
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--isalwa-slate)]/75">
              {capability.risks[0]}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {trailing}
        {interviewHref ? (
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--isalwa-tint-amber-ink)]" aria-hidden />
        ) : null}
      </div>
    </>
  );

  if (interviewHref) {
    return (
      <li>
        <Link
          href={interviewHref}
          className="isalwa-t-fast flex items-start justify-between gap-3 rounded-xl bg-white/80 px-3.5 py-2.5 text-sm ring-1 ring-[var(--isalwa-mist)]/70 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--isalwa-glaze)]/50"
          title={t("discoveryCompletion.continueLinkTitle", { capability: capability.label })}
        >
          {body}
        </Link>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 rounded-xl bg-white/80 px-3.5 py-2.5 text-sm ring-1 ring-[var(--isalwa-mist)]/70">
      {body}
    </li>
  );
}

export function DiscoveryCompletionCard({
  status,
  workspaceId,
  companyName,
  onUploadDocuments,
  onLogMeeting,
  className,
}: {
  status: DiscoveryCompletionStatus;
  /** Mission 20 — when set, missing capabilities become click-throughs into the guided interview. */
  workspaceId?: string;
  /** P0 — personalizes the "still learning" headline when incomplete. */
  companyName?: string;
  /** P0 — Discovery Complete ceremony action: jump to the Knowledge tab to add a document. */
  onUploadDocuments?: () => void;
  /** P0 — Discovery Complete ceremony action: jump to the Knowledge tab to log a new meeting. */
  onLogMeeting?: () => void;
  className?: string;
}) {
  const { t } = useTranslations();
  const style = STATE_STYLES[status.state];
  const Icon = status.state === "complete" ? PartyPopper : Clock3;
  /** Same route the rest of the app already uses to resume discovery — never a new surface. */
  const continueHref = workspaceId ? `/discovery?workspaceId=${workspaceId}` : null;

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

      {/*
        P0 Pilot UX — the honest verdict above already says the diagnosis is
        in progress; this adds the one obvious, personalized invitation to
        keep going, right where the client already looks first. Never hides
        Discovery, never replaces the engine's own copy — only adds the CTA.
      */}
      {status.state === "incomplete" && continueHref ? (
        <div className="mt-4 rounded-2xl bg-white/70 px-4 py-3.5 ring-1 ring-[var(--isalwa-mist)]/80">
          <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
            {t("discoveryCompletion.stillLearningTitle", {
              company: companyName ?? "su empresa",
            })}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--isalwa-slate)]/80">
            {status.estimatedMinutesRemaining
              ? t("discoveryCompletion.stillLearningEta", {
                  minutes: status.estimatedMinutesRemaining,
                })
              : t("discoveryCompletion.stillLearningNoEta")}
          </p>
          <div className="mt-3">
            <Button asChild size="sm">
              <Link href={continueHref}>{t("discoveryCompletion.continueCta")}</Link>
            </Button>
          </div>
        </div>
      ) : null}

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
              <CapabilityRow
                key={capability.id}
                capability={capability}
                tone="open"
                interviewHref={
                  workspaceId ? capabilityInterviewHref(workspaceId, capability.id) : null
                }
              />
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

      {/*
        P0 Pilot UX — "Complete" is a milestone, never a reason to hide
        Discovery. Same three existing surfaces (guided interview, Knowledge
        tab) every other CTA in the app already routes to — no new screens.
      */}
      {status.state === "complete" && (continueHref || onUploadDocuments || onLogMeeting) ? (
        <div className="mt-4">
          <p className="text-xs leading-relaxed text-[var(--isalwa-slate)]/75">
            {t("discoveryCompletion.keepsLearningNote")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {continueHref ? (
              <Button asChild size="sm" variant="secondary">
                <Link href={continueHref}>{t("discoveryCompletion.updateKnowledgeCta")}</Link>
              </Button>
            ) : null}
            {onUploadDocuments ? (
              <Button type="button" size="sm" variant="ghost" onClick={onUploadDocuments}>
                {t("discoveryCompletion.uploadDocumentsCta")}
              </Button>
            ) : null}
            {onLogMeeting ? (
              <Button type="button" size="sm" variant="ghost" onClick={onLogMeeting}>
                {t("discoveryCompletion.logMeetingCta")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
