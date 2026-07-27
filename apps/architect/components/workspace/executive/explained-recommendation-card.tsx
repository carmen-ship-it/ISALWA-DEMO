"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import {
  Beat,
  BeatEmpty,
  BeatList,
  BeatSubLabel,
  StoryBeats,
} from "@/components/workspace/story-beat";
import { useTranslations } from "@/lib/i18n";
import {
  priorityLabelEs,
  roiBandLabelEs,
  type ExplainedRecommendation,
} from "@/lib/explanations";
import { cn } from "@/lib/utils";

export function ExplainedRecommendationCard({
  explained,
  index = 0,
  compact = false,
  className,
}: {
  explained: ExplainedRecommendation;
  index?: number;
  /** Tighter summary for cockpit lists. */
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslations();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className={className}
    >
      <Card className={cn("h-full px-5 py-5", compact && "px-4 py-4")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {!compact ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
                {t("explainedRecommendationCard.recommendationLabel")}
              </p>
            ) : null}
            <p
              className={cn(
                "text-[var(--isalwa-kiln)]",
                compact ? "text-base" : "mt-1 text-xl",
              )}
            >
              {explained.title}
            </p>
            <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
              {explained.businessValue}
            </p>
          </div>
          {explained.priority ? (
            <span className="shrink-0 rounded-full border border-[var(--isalwa-mist)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]">
              {priorityLabelEs(explained.priority)}
            </span>
          ) : null}
        </div>

        <div
          className={cn(
            "mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--isalwa-slate)]/80",
            compact && "mt-3",
          )}
        >
          <span>
            {t("explainedRecommendationCard.roiLabel")}{" "}
            <span className="font-medium text-[var(--isalwa-kiln)]">
              {roiBandLabelEs(explained.expectedRoi.band)}
            </span>
          </span>
          <span>
            {t("explainedRecommendationCard.evidenceLabel")}{" "}
            <span className="font-medium text-[var(--isalwa-kiln)]">
              {explained.evidenceBasis.strengthLabel}
            </span>
          </span>
          {explained.evidence.length > 0 ? (
            <span>
              {t(
                explained.evidence.length === 1
                  ? "explainedRecommendationCard.evidenceCountOne"
                  : "explainedRecommendationCard.evidenceCountMany",
                { count: explained.evidence.length },
              )}
            </span>
          ) : null}
        </div>

        {/*
          Mission 8 — Executive Storytelling. Numbered 7-beat McKinsey spine:
          what happened → why it matters → the evidence → business impact →
          recommended solution → expected result → next step. Presentation
          only — every beat below maps to a field already produced by
          Mission 14's explanation engine (`lib/explanations/`); nothing is
          invented, and every list-shaped field gets an honest empty state.
        */}
        <ExecutiveDetail
          className="mt-2"
          labelExpand={t("explainedRecommendationCard.expandJustification")}
          labelCollapse={t("explainedRecommendationCard.collapseJustification")}
        >
          <StoryBeats>
            <Beat step={1} title={t("explainedRecommendationCard.step1Title")}>
              <p>{explained.problem}</p>
            </Beat>

            <Beat step={2} title={t("explainedRecommendationCard.step2Title")}>
              <p>{explained.observedPattern}</p>
            </Beat>

            <Beat
              step={3}
              title={t("explainedRecommendationCard.step3Title")}
              lead={t("explainedRecommendationCard.step3Lead")}
            >
              {explained.evidence.length === 0 ? (
                <BeatEmpty text={t("explainedRecommendationCard.noEvidence")} />
              ) : (
                <ul className="space-y-1.5">
                  {explained.evidence.map((item, i) => (
                    <li key={`${item.source}-${item.id ?? item.label}-${i}`}>
                      <span className="text-[var(--isalwa-slate)]/60">
                        [{sourceLabel(item.source, t)}]
                      </span>{" "}
                      {item.quote ?? item.label}
                    </li>
                  ))}
                </ul>
              )}
              {explained.supportingFacts.length > 0 ? (
                <div className="mt-3">
                  <BeatSubLabel>
                    {t("explainedRecommendationCard.supportingFactsLabel")}
                  </BeatSubLabel>
                  <BeatList
                    items={explained.supportingFacts}
                    className="mt-1.5 space-y-1.5"
                  />
                </div>
              ) : null}
            </Beat>

            <Beat
              step={4}
              title={t("explainedRecommendationCard.step4Title")}
              lead={t("explainedRecommendationCard.step4Lead")}
            >
              <p>{explained.businessConsequence}</p>
              <p className="mt-2 text-[var(--isalwa-slate)]">
                {explained.businessValue}
              </p>
            </Beat>

            <Beat step={5} title={t("explainedRecommendationCard.step5Title")}>
              <p>{explained.recommendation}</p>
            </Beat>

            <Beat
              step={6}
              title={t("explainedRecommendationCard.step6Title")}
              lead={t("explainedRecommendationCard.step6Lead")}
            >
              <BeatSubLabel>
                {t("explainedRecommendationCard.roiPrefix", {
                  band: roiBandLabelEs(explained.expectedRoi.band),
                })}
              </BeatSubLabel>
              <p className="mt-1.5">{explained.expectedRoi.summary}</p>
              {explained.expectedRoi.drivers.length > 0 ? (
                <BeatList
                  items={explained.expectedRoi.drivers}
                  className="mt-1.5 space-y-1.5"
                />
              ) : null}

              {/*
                Evidence transparency, from the Consultant Readiness Engine.
                The client sees how solid the footing is and what it is made
                of — interviews, documents, observed patterns — never a
                confidence figure. When the footing is thin, the card asks
                for the specific information that would firm it up.
              */}
              <div className="mt-3">
                <BeatSubLabel>
                  {t("explainedRecommendationCard.evidencePrefix", {
                    strength: explained.evidenceBasis.strengthLabel,
                  })}
                </BeatSubLabel>
                <p className="mt-1.5">
                  {t("explainedRecommendationCard.basedOn", {
                    basis: explained.evidenceBasis.basis.join(" · "),
                  })}
                </p>
                {explained.evidenceBasis.askForMore ? (
                  <p className="mt-1.5 text-[var(--isalwa-slate)]">
                    {explained.evidenceBasis.askForMore}
                  </p>
                ) : null}
              </div>
            </Beat>

            <Beat
              step={7}
              title={t("explainedRecommendationCard.step7Title")}
              lead={t("explainedRecommendationCard.step7Lead")}
            >
              {explained.futureDependencies.length === 0 ? (
                <BeatEmpty text={t("explainedRecommendationCard.noDependencies")} />
              ) : (
                <BeatList items={explained.futureDependencies} />
              )}
            </Beat>
          </StoryBeats>
        </ExecutiveDetail>
      </Card>
    </motion.div>
  );
}

function sourceLabel(
  source: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const key = `explainedRecommendationCard.source.${source}`;
  const label = t(key);
  return label === key ? source : label;
}
