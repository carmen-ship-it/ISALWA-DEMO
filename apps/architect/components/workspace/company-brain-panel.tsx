"use client";

import Link from "next/link";
import {
  BadgeCheck,
  Brain,
  CalendarClock,
  ChevronDown,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfidenceMeter } from "@/components/workspace/executive/confidence-meter";
import { capabilityInterviewHref } from "@/components/workspace/executive/discovery-completion-card";
import { RecentLearningList } from "@/components/workspace/executive/executive-daily-brief";
import { SectionShell } from "@/components/workspace/section-shell";
import { useTranslations } from "@/lib/i18n";
import { formatTimelineDate } from "@/lib/timeline";
import type {
  CompanyBrainLearningItem,
  CompanyBrainReport,
  DailyBriefTimelineGroup,
} from "@/lib/consulting-intelligence";

/**
 * Company Brain (Mission 21 — Company Brain pass).
 *
 * The one client-facing place that answers "what does Architect currently
 * know about my company?" — composed entirely from `buildCompanyBrain`
 * (`lib/consulting-intelligence/company-brain.ts`), itself a pure
 * composition of reports the Executive tab, the Assessment tab and the
 * Discovery Complete ceremony already show. Nothing is computed in this
 * file, and no system name (Capability Digital Twin, Missing Information
 * Engine, Consulting Intelligence Agent) ever appears in the copy below —
 * only the mental model a client already has: known, still learning,
 * recent learning, trust.
 */
export function CompanyBrainPanel({
  workspaceId,
  companyName,
  brain,
  recentLearning,
  interviewHref,
  onUploadDocuments,
}: {
  workspaceId: string;
  companyName: string;
  brain: CompanyBrainReport;
  recentLearning: DailyBriefTimelineGroup[];
  interviewHref: string;
  onUploadDocuments: () => void;
}) {
  const { t } = useTranslations();
  const todayCount =
    recentLearning.find((group) => group.id === "today")?.events.length ?? 0;

  return (
    <div className="space-y-8">
      <div className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)]/60 bg-white/70 px-6 py-7 shadow-[var(--isalwa-shadow-card-resting)] sm:px-8 sm:py-8">
        <div className="flex items-start gap-4">
          <span className="isalwa-icon-chip isalwa-ink-gray">
            <Brain className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="isalwa-kicker isalwa-ink-gray">{t("companyBrain.intro.kicker")}</p>
            <h2 className="architect-serif mt-2 text-3xl leading-tight text-[var(--isalwa-kiln)]">
              {t("companyBrain.intro.title", { company: companyName })}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--isalwa-slate)]">
              {t("companyBrain.intro.description")}
            </p>
            {todayCount > 0 ? (
              <p className="mt-3 text-sm font-medium text-[var(--isalwa-kiln)]">
                {todayCount === 1
                  ? t("companyBrain.recent.highlightOne")
                  : t("companyBrain.recent.highlightMany", { count: todayCount })}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* 1 · WHAT ARCHITECT KNOWS */}
      <SectionShell
        tone="processes"
        icon={BadgeCheck}
        kicker={t("companyBrain.knows.kicker")}
        title={t("companyBrain.knows.title")}
        description={brain.knowsHeadline}
      >
        {brain.areas.length === 0 ? (
          <EmptyState
            tone="processes"
            icon={BadgeCheck}
            title={t("companyBrain.knows.emptyTitle")}
            whyItMatters={t("companyBrain.knows.emptyWhy")}
            actionLabel={t("common.continueEvaluation")}
            actionHref={interviewHref}
          />
        ) : (
          <ul className="space-y-3">
            {brain.areas.map((area) => (
              <li
                key={area.id}
                className="rounded-2xl border border-[var(--isalwa-tint-green-border)]/60 bg-white/85 px-5 py-4"
              >
                <details className="group">
                  <summary className="isalwa-t-fast flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 py-1 hover:bg-[var(--isalwa-porcelain)]/80 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/55">
                        Lo que sabemos
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--isalwa-kiln)]">
                        {area.label}
                      </p>
                      <p className="mt-1 text-xs text-[var(--isalwa-slate)]/70">
                        {area.evidenceCount > 0
                          ? `Respaldado por ${area.evidenceCount} ${
                              area.evidenceCount === 1
                                ? "observación real"
                                : "observaciones reales"
                            }`
                          : t("companyBrain.knows.noEvidenceDetail")}
                        {area.lastUpdatedAt
                          ? ` · ${t("companyBrain.knows.lastUpdated", { date: formatTimelineDate(area.lastUpdatedAt) })}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <span className="rounded-full bg-[var(--isalwa-tint-green)]/70 px-2.5 py-1 text-[11px] font-medium tabular-nums text-[var(--isalwa-tint-green-ink)]">
                        {area.confidence}%
                      </span>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-[var(--isalwa-slate)]/50 transition-transform group-open:rotate-180"
                        aria-hidden
                      />
                    </div>
                  </summary>
                  {area.evidence.length > 0 ? (
                    <div className="mt-3 border-t border-[var(--isalwa-mist)]/60 pt-3">
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/55">
                        Por qué lo creemos
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {area.evidence.map((statement) => (
                          <li
                            key={statement}
                            className="text-xs leading-relaxed text-[var(--isalwa-slate)]/85"
                          >
                            • {statement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-3 border-t border-[var(--isalwa-mist)]/60 pt-3 text-xs text-[var(--isalwa-slate)]/60">
                      {t("companyBrain.knows.noEvidenceDetail")}
                    </p>
                  )}
                </details>
              </li>
            ))}
          </ul>
        )}
      </SectionShell>

      {/* 2 · WHAT ARCHITECT IS STILL LEARNING */}
      <SectionShell
        tone="problems"
        icon={Clock3}
        kicker={t("companyBrain.learning.kicker")}
        title={t("companyBrain.learning.title")}
        description={brain.learningHeadline}
      >
        {brain.stillLearning.length === 0 ? (
          <EmptyState
            tone="problems"
            icon={Clock3}
            title={t("companyBrain.learning.emptyTitle")}
            whyItMatters={t("companyBrain.learning.emptyWhy")}
          />
        ) : (
          <ol className="space-y-3">
            {brain.stillLearning.map((item) => (
              <StillLearningRow
                key={item.id}
                item={item}
                href={capabilityInterviewHref(workspaceId, item.id)}
                onUploadDocuments={onUploadDocuments}
              />
            ))}
          </ol>
        )}
      </SectionShell>

      {/* 3 · RECENT LEARNING */}
      <SectionShell
        tone="executive"
        icon={CalendarClock}
        kicker={t("companyBrain.recent.kicker")}
        title={t("companyBrain.recent.title")}
        description={t("companyBrain.recent.description")}
      >
        <RecentLearningList groups={recentLearning} emptyLabel={t("companyBrain.recent.empty")} />
      </SectionShell>

      {/* 4 · TRUST CENTER */}
      <SectionShell
        tone="blueprint"
        icon={ShieldCheck}
        kicker={t("companyBrain.trust.kicker")}
        title={t("companyBrain.trust.title")}
        description={t("companyBrain.trust.description")}
      >
        <div className="rounded-2xl border border-[var(--isalwa-tint-violet-border)]/60 bg-white/85 px-6 py-6">
          <ConfidenceMeter
            value={brain.trust.businessUnderstandingPercent}
            label={t("companyBrain.trust.meterLabel")}
            evidence={brain.trust.evidenceChips}
          />
        </div>
        <p className="mt-5 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {brain.trust.headline}
        </p>
        {brain.trust.missingAreas.length > 0 ? (
          <div className="mt-5 border-t border-[var(--isalwa-mist)]/60 pt-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
              Qué falta aprender — y por qué importa
            </p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {brain.trust.missingAreas.map((label) => (
                <li
                  key={label}
                  className="rounded-full bg-white/85 px-3 py-1 text-xs text-[var(--isalwa-slate)] ring-1 ring-[var(--isalwa-mist)]/80"
                >
                  {label}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-5 border-t border-[var(--isalwa-mist)]/60 pt-5 text-xs leading-relaxed text-[var(--isalwa-slate)]/75">
            {t("companyBrain.trust.noneMissing")}
          </p>
        )}
      </SectionShell>
    </div>
  );
}

function StillLearningRow({
  item,
  href,
  onUploadDocuments,
}: {
  item: CompanyBrainLearningItem;
  href: string | null;
  onUploadDocuments: () => void;
}) {
  const { t } = useTranslations();
  return (
    <li className="rounded-2xl bg-white/85 px-4 py-3.5 ring-1 ring-[var(--isalwa-tint-amber-border)]/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{item.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--isalwa-slate)]/80">{item.why}</p>
        </div>
        {!item.measured ? (
          <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
            {t("companyBrain.learning.notTrackedBadge")}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {item.etaMinutes ? (
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] text-[var(--isalwa-slate)]/70 ring-1 ring-[var(--isalwa-mist)]/70">
            {t("companyBrain.learning.etaLabel", { minutes: item.etaMinutes })}
          </span>
        ) : null}
        {item.impactLabel ? (
          <span className="rounded-full bg-[var(--isalwa-tint-green)]/60 px-2.5 py-1 text-[11px] font-medium text-[var(--isalwa-tint-green-ink)]">
            {item.impactLabel}
          </span>
        ) : null}
        <div className="ml-auto">
          {href ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={href}>{t("companyBrain.learning.teachCta")}</Link>
            </Button>
          ) : (
            <Button type="button" size="sm" variant="ghost" onClick={onUploadDocuments}>
              {t("companyBrain.learning.teachCta")}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
