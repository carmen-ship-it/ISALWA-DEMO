"use client";

import { motion } from "motion/react";
import { UploadCloud } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  consistencyLabel,
  type ConfidenceCategory,
  type ExplainableConfidenceReport,
  type MissingInformationReport,
  type ReadinessAssessment,
  type ReadinessGate,
  type ReadinessState,
  type TopicReadiness,
} from "@/lib/readiness";

/**
 * Consultant Readiness Engine — client surfaces.
 *
 * Everything here speaks the way a consultant speaks: what we already know,
 * what we still need to understand, and how long that would take. There is
 * no confidence figure, no score and no model vocabulary on this screen by
 * design — the engine carries the uncertainty so the client only sees
 * guidance.
 */

const STATE_STYLES: Record<
  ReadinessState,
  { dot: string; surface: string; ink: string; label: string }
> = {
  ready: {
    dot: "bg-[var(--isalwa-success)]",
    surface:
      "border-[var(--isalwa-tint-green-border)]/70 bg-[var(--isalwa-tint-green)]/50",
    ink: "text-[var(--isalwa-tint-green-ink)]",
    label: "Listo",
  },
  almost_ready: {
    dot: "bg-[var(--isalwa-tint-amber-ink)]",
    surface:
      "border-[var(--isalwa-tint-amber-border)]/70 bg-[var(--isalwa-tint-amber)]/50",
    ink: "text-[var(--isalwa-tint-amber-ink)]",
    label: "Casi listo",
  },
  needs_information: {
    dot: "bg-[var(--isalwa-tint-red-ink)]",
    surface:
      "border-[var(--isalwa-tint-red-border)]/70 bg-[var(--isalwa-tint-red)]/40",
    ink: "text-[var(--isalwa-tint-red-ink)]",
    label: "Necesitamos más información",
  },
};

export function ReadinessStateDot({
  state,
  className,
}: {
  state: ReadinessState;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        STATE_STYLES[state].dot,
        className,
      )}
    />
  );
}

/** One line per business topic: where we stand and what would close it. */
export function ReadinessTopicList({ topics }: { topics: TopicReadiness[] }) {
  const { t } = useTranslations();
  const visible = topics.filter((topic) => topic.applicable);
  if (visible.length === 0) {
    return (
      <p className="text-sm text-[var(--isalwa-slate)]/60">
        {t("readinessPanel.topicsPending")}
      </p>
    );
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {visible.map((topic) => {
        const style = STATE_STYLES[topic.state];
        const consistency = consistencyLabel(topic.consistency);
        return (
          <li
            key={topic.topic}
            className={cn(
              "rounded-2xl border px-4 py-3",
              style.surface,
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                {topic.label}
              </p>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-[0.12em]",
                  style.ink,
                )}
              >
                <ReadinessStateDot state={topic.state} />
                {topic.stateLabel}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--isalwa-slate)]/85">
              {topic.headline}
            </p>
            {consistency ? (
              <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
                {consistency}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * "Qué seguimos aprendiendo" — the concrete open questions, each with the
 * reason it matters and an honest time estimate.
 */
export function StillLearningList({
  assessment,
  limit = 5,
}: {
  assessment: ReadinessAssessment;
  limit?: number;
}) {
  const { t } = useTranslations();
  const items = assessment.stillLearning.slice(0, limit);

  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--isalwa-slate)]">
        {t("readinessPanel.noGaps")}
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <motion.li
          key={item.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.35 }}
          className="rounded-2xl bg-white/85 px-4 py-3 ring-1 ring-[var(--isalwa-mist)]/70"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-relaxed text-[var(--isalwa-kiln)]">
              {item.question}
            </p>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
              <ReadinessStateDot state={item.state} />
              {item.label}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--isalwa-slate)]/80">
            {item.why}
            {item.estimatedMinutes
              ? t("readinessPanel.estimatedMinutesSuffix", { minutes: item.estimatedMinutes })
              : ""}
          </p>
        </motion.li>
      ))}
    </ol>
  );
}

/** Soft clarifications when two sources tell a slightly different story. */
export function ReadinessConflictList({
  assessment,
  limit = 3,
}: {
  assessment: ReadinessAssessment;
  limit?: number;
}) {
  const { t } = useTranslations();
  const conflicts = assessment.conflicts.slice(0, limit);
  if (conflicts.length === 0) return null;

  return (
    <div className="mt-6 border-t border-[var(--isalwa-mist)]/60 pt-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
        {t("readinessPanel.pointsToConfirm")}
      </p>
      <ul className="mt-3 space-y-2">
        {conflicts.map((conflict) => (
          <li
            key={conflict.id}
            className="rounded-2xl bg-white/80 px-4 py-3 text-sm leading-relaxed text-[var(--isalwa-slate)] ring-1 ring-[var(--isalwa-tint-amber-border)]/70"
          >
            {conflict.statement}
            {conflict.sourceLabels.length > 0 ? (
              <span className="mt-1 block text-xs text-[var(--isalwa-slate)]/60">
                {t("readinessPanel.accordingTo", {
                  sources: conflict.sourceLabels
                    .join(t("readinessPanel.and"))
                    .toLowerCase(),
                })}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What the file is built on today — evidence in client language. */
export function ReadinessEvidenceChips({
  assessment,
}: {
  assessment: ReadinessAssessment;
}) {
  const { t } = useTranslations();
  const { inventory } = assessment;
  const chips = [
    inventory.interviewFacts > 0
      ? t("readinessPanel.chips.interviewFacts", { count: inventory.interviewFacts })
      : null,
    inventory.documents > 0
      ? t(
          inventory.documents === 1
            ? "readinessPanel.chips.documentsOne"
            : "readinessPanel.chips.documentsMany",
          { count: inventory.documents },
        )
      : null,
    inventory.importedRecords > 0
      ? t(
          inventory.importedRecords === 1
            ? "readinessPanel.chips.recordsOne"
            : "readinessPanel.chips.recordsMany",
          { count: inventory.importedRecords },
        )
      : null,
    inventory.businessRules > 0
      ? t(
          inventory.businessRules === 1
            ? "readinessPanel.chips.rulesOne"
            : "readinessPanel.chips.rulesMany",
          { count: inventory.businessRules },
        )
      : null,
    inventory.meetings > 0
      ? t(
          inventory.meetings === 1
            ? "workspaceView.chips.meetingsOne"
            : "workspaceView.chips.meetingsMany",
          { count: inventory.meetings },
        )
      : null,
  ].filter(Boolean) as string[];

  if (chips.length === 0) return null;

  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li
          key={chip}
          className="rounded-full bg-white/85 px-3 py-1 text-xs text-[var(--isalwa-slate)] ring-1 ring-[var(--isalwa-mist)]/80"
        >
          {chip}
        </li>
      ))}
    </ul>
  );
}

/**
 * Readiness gate for a deliverable — Ready / Almost Ready with a single,
 * concrete call to action. Never blocks the client from looking; it sets the
 * expectation of how firm what they are looking at really is.
 */
export function ReadinessGateCard({
  gate,
  onAction,
  actionHref,
  className,
}: {
  gate: ReadinessGate;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}) {
  const { t } = useTranslations();
  const style = STATE_STYLES[gate.state];

  return (
    <Card className={cn("border px-5 py-5 shadow-none", style.surface, className)}>
      <div className="flex items-center gap-2">
        <ReadinessStateDot state={gate.state} />
        <p
          className={cn(
            "text-[11px] font-medium uppercase tracking-[0.16em]",
            style.ink,
          )}
        >
          {gate.stateLabel}
        </p>
      </div>
      <p className="architect-serif mt-3 text-2xl leading-tight text-[var(--isalwa-kiln)]">
        {gate.title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {gate.message}
      </p>

      {gate.missingInformation.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {gate.missingInformation.map((item) => (
            <li
              key={item}
              className="text-sm leading-relaxed text-[var(--isalwa-slate)]/85"
            >
              {t("readinessPanel.needToUnderstand", { item })}
            </li>
          ))}
        </ul>
      ) : null}

      {onAction || actionHref ? (
        <div className="mt-5">
          {onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="rounded-full bg-[var(--isalwa-kiln)] px-5 py-2.5 text-sm text-white transition hover:opacity-90"
            >
              {gate.ctaLabel}
            </button>
          ) : (
            <a
              href={actionHref}
              className="inline-block rounded-full bg-[var(--isalwa-kiln)] px-5 py-2.5 text-sm text-white transition hover:opacity-90"
            >
              {gate.ctaLabel}
            </a>
          )}
        </div>
      ) : null}
    </Card>
  );
}

/**
 * Missing Information Engine — client surface.
 *
 * Same gaps as `StillLearningList`, ranked instead by estimated business
 * impact and paired with a concrete next upload when one exists. Every
 * "+X%" figure is produced by `lib/readiness/missing-information.ts` from
 * the same math the Discovery Score already uses — this component only
 * renders it, it never computes anything.
 */
export function MissingInformationList({
  report,
  limit = 3,
  onUploadClick,
}: {
  report: MissingInformationReport;
  limit?: number;
  /** Called when the client wants to act on an upload suggestion now. */
  onUploadClick?: () => void;
}) {
  const { t } = useTranslations();
  const items = report.opportunities.slice(0, limit);

  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--isalwa-slate)]/60">
        {t("missingInformationPanel.emptyReady")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-[var(--isalwa-kiln)]">
        {report.headline}
      </p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-2xl border border-[var(--isalwa-mist)]/70 bg-white/85 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
                {item.headline}
              </p>
              <span className="shrink-0 rounded-full bg-[var(--isalwa-tint-green)]/60 px-2.5 py-1 text-[11px] font-medium tabular-nums text-[var(--isalwa-tint-green-ink)]">
                +{item.estimatedLiftPercent}%
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
              <span>{item.topicLabel}</span>
              <span aria-hidden>·</span>
              <span>{t("missingInformationPanel.estimatedImpact")}</span>
            </div>
            {item.uploadable && onUploadClick ? (
              <button
                type="button"
                onClick={onUploadClick}
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--isalwa-glaze-deep)] transition hover:opacity-80"
              >
                <UploadCloud className="h-3.5 w-3.5" aria-hidden />
                {t("missingInformationPanel.uploadCta")}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Compact "next best upload" call to action for empty states — the Knowledge
 * upload surface, when the client has not yet given us much to work with.
 * Shows only the single highest-impact opportunity, never a full list, so it
 * reads as a nudge rather than another dashboard.
 */
export function NextUploadCta({
  report,
  onUploadClick,
  className,
}: {
  report: MissingInformationReport;
  onUploadClick?: () => void;
  className?: string;
}) {
  const { t } = useTranslations();
  const top = report.opportunities[0];
  if (!top) return null;

  return (
    <Card
      className={cn(
        "border-[var(--isalwa-tint-amber-border)]/70 bg-[var(--isalwa-tint-amber)]/40 px-5 py-4 shadow-none",
        className,
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-tint-amber-ink)]">
        {t("missingInformationPanel.compactTitle")}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
        {top.headline}
      </p>
      {top.uploadable && onUploadClick ? (
        <button
          type="button"
          onClick={onUploadClick}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--isalwa-kiln)] px-4 py-2 text-xs font-medium text-white transition hover:opacity-90"
        >
          <UploadCloud className="h-3.5 w-3.5" aria-hidden />
          {t("missingInformationPanel.uploadCta")}
        </button>
      ) : null}
    </Card>
  );
}

/**
 * Explainable Confidence — client surface.
 *
 * Replaces a bare confidence percentage with the breakdown a senior
 * consultant would give when asked "why that number": one row per business
 * category, each with its own evidence-backed score (or an honest "not
 * enough information yet"), why it is what it is, and a concrete way to
 * raise it. Every field is rendered verbatim from
 * `lib/readiness/explainable-confidence.ts` — this component computes
 * nothing.
 */
function ConfidenceCategoryRow({
  category,
  onUploadClick,
}: {
  category: ConfidenceCategory;
  onUploadClick?: () => void;
}) {
  const { t } = useTranslations();

  return (
    <li className="rounded-2xl border border-[var(--isalwa-mist)]/70 bg-white/85 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{category.label}</p>
          {category.kind === "core" && category.weightPercent != null ? (
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/50">
              {t("explainableConfidence.weightHint", { percent: category.weightPercent })}
            </p>
          ) : null}
        </div>
        {category.score != null ? (
          <span className="shrink-0 rounded-full bg-[var(--isalwa-tint-blue)]/70 px-2.5 py-1 text-[11px] font-medium tabular-nums text-[var(--isalwa-tint-blue-ink)]">
            {category.score}%
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-[var(--isalwa-mist)]/60 px-2.5 py-1 text-[11px] font-medium text-[var(--isalwa-slate)]/70">
            {t("explainableConfidence.notEnoughInformation")}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--isalwa-slate)]/85">{category.why}</p>
      {category.howToRaise.length > 0 ? (
        <div className="mt-2 space-y-1 border-t border-[var(--isalwa-mist)]/50 pt-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--isalwa-glaze-deep)]">
            {t("explainableConfidence.howToRaise")}
          </p>
          {category.howToRaise.map((line) => (
            <p key={line} className="text-xs leading-relaxed text-[var(--isalwa-slate)]/85">
              {line}
            </p>
          ))}
        </div>
      ) : null}
      {category.uploadable && category.uploadSuggestions.length > 0 && onUploadClick ? (
        <button
          type="button"
          onClick={onUploadClick}
          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--isalwa-glaze-deep)] transition hover:opacity-80"
        >
          <UploadCloud className="h-3.5 w-3.5" aria-hidden />
          {t("missingInformationPanel.uploadCta")}
        </button>
      ) : null}
    </li>
  );
}

/**
 * Full breakdown: the detective headline, every core category (these
 * average exactly to the overall number shown elsewhere), then the
 * supplementary signals — clearly separated and captioned as not counted
 * into the overall score, so nothing here reads as a second, competing
 * number.
 */
export function ExplainableConfidenceBreakdown({
  report,
  onUploadClick,
  className,
}: {
  report: ExplainableConfidenceReport;
  onUploadClick?: () => void;
  className?: string;
}) {
  const { t } = useTranslations();

  return (
    <div className={cn("space-y-6", className)}>
      <p className="text-sm leading-relaxed text-[var(--isalwa-kiln)]">{report.headline}</p>

      <ul className="space-y-2.5">
        {report.coreCategories.map((category) => (
          <ConfidenceCategoryRow
            key={category.id}
            category={category}
            onUploadClick={onUploadClick}
          />
        ))}
      </ul>

      {report.supplementaryCategories.length > 0 ? (
        <div className="border-t border-[var(--isalwa-mist)]/60 pt-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
            {t("explainableConfidence.supplementaryTitle")}
          </p>
          <p className="mt-1 text-xs text-[var(--isalwa-slate)]/70">
            {t("explainableConfidence.supplementaryHint")}
          </p>
          <ul className="mt-3 space-y-2.5">
            {report.supplementaryCategories.map((category) => (
              <ConfidenceCategoryRow
                key={category.id}
                category={category}
                onUploadClick={onUploadClick}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
