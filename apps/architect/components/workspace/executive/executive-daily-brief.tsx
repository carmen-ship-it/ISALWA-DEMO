"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Circle, CircleDot, Compass, History, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfidenceMeter } from "@/components/workspace/executive/confidence-meter";
import { SectionShell } from "@/components/workspace/section-shell";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  DailyBriefMilestone,
  DailyBriefTimelineGroup,
  ExecutiveDailyBrief as ExecutiveDailyBriefReport,
} from "@/lib/consulting-intelligence";

/**
 * Mission 20 — Executive Daily Brief.
 *
 * Replaces the old `WelcomeBanner` as the Executive tab's hero. Every string
 * rendered here is either a direct pass-through from `ExecutiveDailyBrief`
 * (`lib/consulting-intelligence/daily-brief.ts` — itself a pure composition
 * of `NextStepVoice`, the Missing Information Engine and real
 * timeline/meeting/document timestamps) or existing chrome copy from
 * `lib/i18n`. Nothing is computed in this file.
 *
 * The caller (`WorkspaceView`) resolves each action's concrete href/tab
 * switch — same rule `next-step-voice.ts` already established — so this
 * component stays free of routing knowledge.
 */

export interface ResolvedDailyBriefAction {
  id: string;
  message: string;
  actionLabel: string;
  impactLabel: string | null;
  href?: string;
  onClick?: () => void;
}

function ActionRow({ rank, action }: { rank: number; action: ResolvedDailyBriefAction }) {
  return (
    <li className="isalwa-t-fast flex flex-col gap-3 rounded-2xl bg-white/85 px-5 py-4 shadow-[var(--isalwa-shadow-resting)] ring-1 ring-[var(--isalwa-tint-blue-border)] hover:shadow-[var(--isalwa-shadow-hover)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="architect-serif isalwa-icon-chip isalwa-ink-blue !h-8 !w-8 shrink-0 text-sm">
          {rank}
        </span>
        <div className="min-w-0">
          <p className="text-sm leading-relaxed text-[var(--isalwa-kiln)]">{action.message}</p>
          {action.impactLabel ? (
            <span className="mt-1.5 inline-flex items-center rounded-full bg-[var(--isalwa-tint-green)]/60 px-2.5 py-0.5 text-[11px] font-medium text-[var(--isalwa-tint-green-ink)]">
              {action.impactLabel}
            </span>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 pl-11 sm:pl-3">
        {action.onClick ? (
          <Button type="button" size="sm" variant="secondary" onClick={action.onClick}>
            {action.actionLabel}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
          </Button>
        ) : action.href ? (
          <Button asChild size="sm" variant="secondary">
            <Link href={action.href}>
              {action.actionLabel}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/** Items 1–3: greeting + where we are, since your last visit, today's ranked recommendations. */
export function ExecutiveDailyBriefHero({
  displayName,
  brief,
  actions,
  brandMessage,
  onExplore,
}: {
  displayName: string;
  brief: ExecutiveDailyBriefReport;
  /** Up to three, ranked highest priority first — already resolved to a concrete href/onClick by the caller. */
  actions: ResolvedDailyBriefAction[];
  /** White Label Company Experience — consultant-configured homepage message, same precedence `WelcomeBanner` used. */
  brandMessage?: string | null;
  /** Scrolls to the full consulting briefing below (`#cabina-ejecutiva`) — same affordance `WelcomeBanner` offered. */
  onExplore?: () => void;
}) {
  const { t } = useTranslations();

  return (
    <SectionShell
      tone="executive"
      size="hero"
      icon={Compass}
      kicker={t("executiveDailyBrief.kicker")}
      title={t("welcomeBanner.greeting", { name: displayName })}
      description={brandMessage ?? brief.headline}
    >
      <div className="mb-6 flex items-start gap-3 rounded-[var(--isalwa-radius-panel)] bg-white/90 px-5 py-4 shadow-[var(--isalwa-shadow-resting)] ring-1 ring-[var(--isalwa-tint-blue-border)]">
        <span className="isalwa-icon-chip isalwa-ink-blue !h-7 !w-7 shrink-0">
          <History className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="isalwa-kicker isalwa-ink-blue">
            {t("executiveDailyBrief.sinceLastVisitKicker")}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {brief.sinceLastVisit.summary}
          </p>
        </div>
      </div>

      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--isalwa-glaze-deep)]">
        {t("executiveDailyBrief.recommendedKicker")}
      </p>
      {actions.length > 0 ? (
        <ol className="space-y-3">
          {actions.map((action, index) => (
            <ActionRow key={action.id} rank={index + 1} action={action} />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-[var(--isalwa-slate)]">{t("executiveDailyBrief.noActions")}</p>
      )}

      {onExplore ? (
        <div className="mt-6">
          <Button type="button" variant="ghost" onClick={onExplore}>
            {t("welcomeBanner.viewExecutiveSummary")}
          </Button>
        </div>
      ) : null}

      {/*
        P0 Pilot UX — reinforces that Discovery is continuous, not a
        one-time form: the same tagline the guided interview's Continuation
        Hero and the Discovery Complete ceremony already use.
      */}
      <p className="mt-5 text-xs leading-relaxed text-[var(--isalwa-slate)]/70">
        {t("welcomeBanner.tagline")}
      </p>
    </SectionShell>
  );
}

/** Item 4: Business Understanding, calm animated progress — the same honest number, never a growth claim it can't back up. */
export function DailyBriefUnderstanding({
  percent,
  evidenceChips,
}: {
  percent: number;
  evidenceChips: string[];
}) {
  const { t } = useTranslations();
  return (
    <SectionShell
      tone="health"
      kicker={t("executiveDailyBrief.understandingKicker")}
      title={t("executiveDailyBrief.understandingTitle")}
    >
      <Card className="border-[var(--isalwa-tint-teal-border)]/60 bg-white/85 px-6 py-6 shadow-none">
        <ConfidenceMeter value={percent} evidence={evidenceChips} />
      </Card>
    </SectionShell>
  );
}

/**
 * The grouped Hoy / Ayer / Última semana / Anteriormente list itself, with no
 * `SectionShell` wrapper — shared by `DailyBriefRecentLearning` (Executive
 * tab, gray tone, fixed copy) and the Company Brain's own "Recent Learning"
 * section (Mission 21 — Company Brain pass, blue tone, different copy) so
 * neither forks a second copy of the same real-timeline rendering.
 */
export function RecentLearningList({
  groups,
  emptyLabel,
}: {
  groups: DailyBriefTimelineGroup[];
  emptyLabel: string;
}) {
  if (groups.length === 0) {
    return <p className="text-sm text-[var(--isalwa-slate)]">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.id}>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
            {group.label}
          </p>
          <ol className="mt-2.5 space-y-2">
            {group.events.map((event) => (
              <li
                key={event.id}
                className="rounded-2xl bg-white/80 px-4 py-3 text-sm ring-1 ring-[var(--isalwa-mist)]/70"
              >
                <p className="text-[var(--isalwa-kiln)]">{event.title}</p>
                {event.description ? (
                  <p className="mt-1 text-xs leading-relaxed text-[var(--isalwa-slate)]/75">
                    {event.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

/** Item 5: Recent Learning — real `workspace.timeline`, grouped Hoy / Ayer / Última semana / Anteriormente. */
export function DailyBriefRecentLearning({
  groups,
}: {
  groups: DailyBriefTimelineGroup[];
}) {
  const { t } = useTranslations();
  return (
    <SectionShell
      tone="deliverables"
      icon={CalendarClock}
      kicker={t("executiveDailyBrief.recentLearningKicker")}
      title={t("executiveDailyBrief.recentLearningTitle")}
      description={t("executiveDailyBrief.recentLearningDescription")}
    >
      <RecentLearningList groups={groups} emptyLabel={t("executiveDailyBrief.noRecentLearning")} />
    </SectionShell>
  );
}

/** Item 6: Next Milestones — open circles for the same missing/not-tracked capabilities the Discovery Complete ceremony already lists in full detail below. */
export function DailyBriefMilestones({
  milestones,
  milestoneHref,
}: {
  milestones: DailyBriefMilestone[];
  milestoneHref: (milestone: DailyBriefMilestone) => string | undefined;
}) {
  const { t } = useTranslations();
  return (
    <SectionShell
      tone="problems"
      icon={Target}
      kicker={t("executiveDailyBrief.milestonesKicker")}
      title={t("executiveDailyBrief.milestonesTitle")}
      description={t("executiveDailyBrief.milestonesDescription")}
    >
      {milestones.length === 0 ? (
        <p className="text-sm text-[var(--isalwa-slate)]">
          {t("executiveDailyBrief.noMilestones")}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2.5">
          {milestones.map((milestone) => {
            const href = milestoneHref(milestone);
            const Icon = milestone.state === "open" ? CircleDot : Circle;
            const content = (
              <>
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {milestone.label}
              </>
            );
            const toneClass =
              milestone.state === "open"
                ? "bg-white/85 text-[var(--isalwa-kiln)] ring-[var(--isalwa-tint-amber-border)]/80"
                : "bg-white/60 text-[var(--isalwa-slate)]/60 ring-[var(--isalwa-mist)]/70";
            return (
              <li key={milestone.id}>
                {href ? (
                  <Link
                    href={href}
                    title={milestone.detail ?? undefined}
                    className={cn(
                      "isalwa-t-fast inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm ring-1 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--isalwa-glaze)]/50",
                      toneClass,
                    )}
                  >
                    {content}
                  </Link>
                ) : (
                  <span
                    title={milestone.detail ?? undefined}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm ring-1",
                      toneClass,
                    )}
                  >
                    {content}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionShell>
  );
}
