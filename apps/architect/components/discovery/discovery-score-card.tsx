"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { t, useTranslations } from "@/lib/i18n";
import { strengthBand, understandingLevel, understandingSentence } from "@/lib/presentation";
import type { DiscoveryScore, DimensionStatus } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Maturity label, not a live per-topic percentage — same `strengthBand`
 * thresholds the rest of the app already uses to read confidence, just
 * collapsed to the three consultative words a client recognizes (Low and
 * Emerging both read as "Inicial": neither is a meaningful distinction to a
 * client mid-interview). No new scorer, no new threshold.
 */
function dimensionDisplay(dimension: DimensionStatus): string {
  if (dimension.applicable === false) return t("discoveryScoreCard.notApplicable");
  if (dimension.confidence <= 0) return t("discoveryScoreCard.noEvidence");
  const band = strengthBand(dimension.confidence, "percent");
  if (band === "High") return t("discoveryScoreCard.maturityConfirmed");
  if (band === "Medium") return t("discoveryScoreCard.maturityInProgress");
  return t("discoveryScoreCard.maturityInitial");
}

export function DiscoveryScoreCard({
  score,
  showPercent = true,
}: {
  score: DiscoveryScore;
  /**
   * Conversation, not exam — hides the live numeric percentage for a client
   * mid-interview while keeping the same qualitative word every other
   * surface already uses. Consultants keep the number. No new scoring.
   */
  showPercent?: boolean;
}) {
  const { t } = useTranslations();
  const applicableDimensions = score.dimensions.filter(
    (dimension) => dimension.applicable !== false,
  );
  const coveredCount = applicableDimensions.filter((d) => d.covered).length;
  const totalCount = applicableDimensions.length;
  const topicsProgress = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0;

  return (
    <Card className="overflow-hidden px-5 py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
        {t("discoveryScoreCard.businessUnderstanding")}
      </p>
      {/*
        Wording leads, percentage follows — a client reads "En desarrollo"
        faster than a bare number. The percentage stays on screen (never
        dropped), just demoted to a secondary, smaller figure next to it.
      */}
      <div className="mt-3 flex items-end gap-2">
        <motion.span
          key={score.overall}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="architect-serif text-5xl leading-none text-[var(--isalwa-kiln)]"
        >
          {understandingLevel(score.overall)}
        </motion.span>
        {showPercent ? (
          <span className="mb-1 text-lg text-[var(--isalwa-slate)]/60">
            · {score.overall}%
          </span>
        ) : null}
      </div>
      {/* Confidence in plain, human language — never the raw score alone. */}
      <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {understandingSentence(score.overall)}
      </p>

      {totalCount > 0 ? (
        <div className="mt-5 border-t border-[var(--isalwa-mist)]/70 pt-4">
          <div className="flex items-center justify-between text-xs text-[var(--isalwa-slate)]/80">
            <span>{t("discoveryScoreCard.topicsCovered")}</span>
            <span>
              {t("discoveryScoreCard.ofTotal", { covered: coveredCount, total: totalCount })}
            </span>
          </div>
          <Progress value={topicsProgress} className="mt-1.5" />
        </div>
      ) : null}

      <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
        {t("discoveryScoreCard.confidenceByTopic")}
      </p>
      <ul className="mt-3 space-y-2.5">
        {score.dimensions.map((dimension) => (
          <li
            key={dimension.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex items-center gap-2 text-[var(--isalwa-slate)]">
              <span
                className={cn(
                  "inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                  dimension.applicable === false
                    ? "border border-dashed border-[var(--isalwa-mist)] text-[var(--isalwa-slate)]/40"
                    : dimension.covered
                      ? "bg-[var(--isalwa-kiln)] text-white"
                      : "border border-[var(--isalwa-mist)] text-[var(--isalwa-slate)]/60",
                )}
                aria-hidden
              >
                {dimension.applicable === false
                  ? "—"
                  : dimension.covered
                    ? "✓"
                    : "○"}
              </span>
              {dimension.label}
            </span>
            <span
              className={cn(
                "text-xs",
                dimension.confidence <= 0 || dimension.applicable === false
                  ? "text-[var(--isalwa-slate)]/60"
                  : "text-[var(--isalwa-slate)]/80",
              )}
            >
              {dimensionDisplay(dimension)}
            </span>
          </li>
        ))}
      </ul>

      {score.stillNeed.length > 0 ? (
        <div className="mt-5 border-t border-[var(--isalwa-mist)]/70 pt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/80">
            {t("discoveryScoreCard.stillMissing")}
          </p>
          <ul className="mt-2 space-y-1">
            {score.stillNeed.slice(0, 4).map((item) => (
              <li key={item} className="text-sm text-[var(--isalwa-slate)]">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
