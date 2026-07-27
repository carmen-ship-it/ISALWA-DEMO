"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { FileText } from "lucide-react";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { applyBrandOverrides, type EffectiveBrandExperience } from "@/lib/brand";
import { t, useTranslations } from "@/lib/i18n";
import { createClientInterviewPersistence } from "@/lib/persistence";
import {
  complexityLabel,
  moduleLabel,
  phaseLabel,
  timelineEstimateLabel,
} from "@/lib/presentation";
import {
  assessMemoryExplainableConfidence,
  assessMemoryReadiness,
  assessExplainableConfidence,
  assessReadiness,
  blueprintReadinessGate,
  TOPIC_PATTERNS,
  type ExplainableConfidenceReport,
  type ReadinessAssessment,
} from "@/lib/readiness";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import type { DiscoveryReport } from "@/types";
import { cn } from "@/lib/utils";
import {
  ExplainableConfidenceBreakdown,
  ReadinessStateDot,
  StillLearningList,
} from "@/components/workspace/executive/readiness-panel";
import { BeatSubLabel } from "@/components/workspace/story-beat";

/**
 * Premium Visual Quality pass — report sections read as a bound executive
 * report instead of a stack of form fields. Presentation only: every prop
 * and data source below is unchanged from before this mission. `tone`
 * reuses the same section-identity tint tokens `SectionShell` uses
 * elsewhere in the app (Mission 9) — a highlighted callout instead of a
 * bespoke color, applied only to the handful of sections an executive
 * would actually flag in a printed report (summary, risks, recommendations,
 * conclusion). Everything else stays a quiet, paper-like list so the
 * highlights keep their meaning.
 *
 * Evidence-Adaptive Reports — every section below only renders when the
 * evidence behind it justifies the space. This never invents data: it
 * reuses the same Consultant Readiness Engine (`lib/readiness`) the rest of
 * the app already reasons with, so "is there enough here to show this
 * section" is answered the same way everywhere. See
 * `apps/architect/ADAPTIVE_EVIDENCE_REPORTS.md`.
 *
 * Report as Business Story — the report no longer reads as a stack of
 * unrelated sections. `ReportBody` now tells ONE McKinsey/Bain-style story
 * in nine beats — what we discovered → why it matters → the evidence →
 * business impact → risk → opportunity → recommended investment → expected
 * ROI → next steps — reusing the exact same `DiscoveryReport` /
 * `ReadinessAssessment` fields as before, just narratively regrouped. Every
 * beat title comes from the shared `storyBeats` i18n vocabulary so the
 * Living Report, the deliverables Executive Summary and the recommendation
 * cards all tell the story in the same words. `Section`'s own numbered
 * index (01, 02…) IS this report's beat marker — no second numbering
 * system is introduced; only `BeatSubLabel` (Mission 8's shared
 * `story-beat.tsx` primitive) is reused inside each beat to caption the
 * evidence it is built from. A beat is omitted entirely — never shown as an
 * empty shell — when the evidence behind it is missing, extending the same
 * rule Evidence-Adaptive Reports already established. See
 * `apps/architect/REPORT_BUSINESS_STORY.md`.
 */
const GENERIC_RISK_LINES = new Set([
  "Sobre-automatizar traspasos que ya están rotos",
  "Reemplazar hojas de cálculo sin resolver primero la claridad de propiedad",
]);
type ReportTone = "blue" | "teal" | "amber" | "red" | "violet" | "green" | "gray";

const TONE_SURFACE: Record<ReportTone, string> = {
  blue: "isalwa-surface-blue",
  teal: "isalwa-surface-teal",
  amber: "isalwa-surface-amber",
  red: "isalwa-surface-red",
  violet: "isalwa-surface-violet",
  green: "isalwa-surface-green",
  gray: "isalwa-surface-gray",
};

const TONE_INK: Record<ReportTone, string> = {
  blue: "isalwa-ink-blue",
  teal: "isalwa-ink-teal",
  amber: "isalwa-ink-amber",
  red: "isalwa-ink-red",
  violet: "isalwa-ink-violet",
  green: "isalwa-ink-green",
  gray: "isalwa-ink-gray",
};

function Section({
  index,
  title,
  intro,
  tone,
  children,
  delay = 0,
}: {
  index: number;
  title: string;
  /** One-sentence connective lead-in — frames why this section is here. Presentation only. */
  intro?: string;
  /** Highlight a handful of executive-critical sections with a tinted callout, matching `SectionShell`'s tone language. Omit for the quiet default. */
  tone?: ReportTone;
  children: ReactNode;
  delay?: number;
}) {
  const highlighted = Boolean(tone);
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: Math.min(delay, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        highlighted &&
          cn(
            TONE_SURFACE[tone!],
            "rounded-[var(--isalwa-radius-panel)] border px-6 py-7 sm:px-8 sm:py-8",
          ),
      )}
    >
      <div className="flex items-baseline gap-3">
        <span
          className={cn(
            "isalwa-metric shrink-0 text-xs",
            highlighted ? TONE_INK[tone!] : "text-[var(--isalwa-slate)]/45",
          )}
        >
          {String(index).padStart(2, "0")}
        </span>
        <h2
          className={cn(
            // Deliberately not `.isalwa-kicker` — that shared class locks
            // color to the glaze accent, but most report section labels
            // stay neutral slate; only the handful of highlighted sections
            // (tone set) borrow the section-identity ink color, matching
            // the same tint tokens `SectionShell` uses elsewhere.
            "text-[11px] font-semibold uppercase tracking-[0.16em]",
            highlighted ? TONE_INK[tone!] : "text-[var(--isalwa-slate)]",
          )}
        >
          {title}
        </h2>
      </div>
      <div className="pl-9 sm:pl-10">
        {intro ? (
          <p className="architect-serif mt-2 max-w-2xl text-lg leading-snug text-[var(--isalwa-kiln)]">
            {intro}
          </p>
        ) : null}
        <div className="mt-4 text-base leading-relaxed text-[var(--isalwa-slate)]">
          {children}
        </div>
      </div>
    </motion.section>
  );
}

function recommendationPriorityLabel(
  priority: DiscoveryReport["opportunities"][number]["priority"],
): string {
  switch (priority) {
    case "now":
      return t("reportView.priorityNow");
    case "next":
      return t("reportView.priorityNext");
    case "later":
      return t("reportView.priorityLater");
    default:
      return priority;
  }
}

function ReportBody({
  report,
  readiness,
  explainableConfidence,
}: {
  report: DiscoveryReport;
  readiness: ReadinessAssessment | null;
  explainableConfidence: ExplainableConfidenceReport | null;
}) {
  const { t } = useTranslations();
  let i = 0;
  const next = () => ++i;

  const financeTopic = readiness?.topics.find(
    (topic) => topic.topic === "finance",
  );
  const financeHasNoEvidence = Boolean(
    financeTopic?.applicable && financeTopic.state === "needs_information",
  );
  const visibleOpportunities = financeHasNoEvidence
    ? report.opportunities.filter(
        (item) =>
          !TOPIC_PATTERNS.finance.test(`${item.title} ${item.rationale}`),
      )
    : report.opportunities;

  const blueprintGate = readiness ? blueprintReadinessGate(readiness) : null;
  const showImplementationPlan = !blueprintGate || blueprintGate.unlocked;

  const hasEvidencedRisk = Boolean(
    report.consultingRisks && report.consultingRisks.length > 0,
  );
  const visibleGeneralRisks = report.risks.filter(
    (item) => !GENERIC_RISK_LINES.has(item),
  );

  const confidenceTone: ReportTone =
    readiness?.overallState === "ready"
      ? "green"
      : readiness?.overallState === "almost_ready"
        ? "amber"
        : "red";

  // Report as Business Story — one beat is omitted, never shown empty, when
  // its underlying evidence is missing. Every boolean below reads a signal
  // that already existed before this mission (readiness, consulting
  // engines, the same filtered lists Evidence-Adaptive Reports computed).
  const hasBusinessImpact = Boolean(
    report.consultingMaturity || report.consultingHealth,
  );
  const hasContradictions = Boolean(
    report.consultingContradictions && report.consultingContradictions.length > 0,
  );
  const showEvidenceBeat = Boolean(readiness) || hasContradictions;
  const hasOpportunityContent =
    visibleOpportunities.length > 0 ||
    (report.consultingOpportunities?.length ?? 0) > 0 ||
    report.aiOpportunities.length > 0;
  const showInvestmentBeat =
    showImplementationPlan || report.potentialModules.length > 0;

  return (
    <div className="isalwa-section-gap">
      {/* Beat 1 — What we discovered */}
      <Section
        index={next()}
        title={t("storyBeats.discovered")}
        intro={t("reportView.executiveSummaryIntro")}
        tone="blue"
        delay={0.05}
      >
        <p>{report.executiveSummary}</p>

        <div className="mt-6">
          <BeatSubLabel>{t("reportView.businessSnapshot")}</BeatSubLabel>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-[var(--isalwa-slate)]">
            {report.businessSnapshot}
          </pre>
        </div>

        <div className="mt-6">
          <BeatSubLabel>{t("reportView.currentWorkflow")}</BeatSubLabel>
          <div className="mt-3 space-y-6">
            {report.currentWorkflow.map((workflow) => (
              <div key={workflow.id}>
                <h3 className="architect-serif text-2xl text-[var(--isalwa-kiln)]">
                  {workflow.name}
                </h3>
                <p className="mt-2 text-[var(--isalwa-slate)]">{workflow.summary}</p>
                <ol className="mt-4 space-y-2">
                  {workflow.steps.map((step) => (
                    <li key={step} className="flex gap-3 text-[var(--isalwa-slate)]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--isalwa-slate)]/60" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>

        {report.currentSystems.length > 0 ? (
          <div className="mt-6">
            <BeatSubLabel>{t("reportView.currentSystems")}</BeatSubLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {report.currentSystems.map((system) => (
                <span key={system} className="isalwa-chip !cursor-default">
                  {system}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </Section>

      {/* Beat 2 — Why it matters */}
      {report.painPoints.length > 0 ? (
        <Section
          index={next()}
          title={t("storyBeats.whyItMatters")}
          intro={t("reportView.painPointsIntro")}
          tone="amber"
          delay={0.08}
        >
          <BeatSubLabel>{t("reportView.painPoints")}</BeatSubLabel>
          <ul className="mt-3 space-y-4">
            {report.painPoints.map((pain) => (
              <li key={pain.id}>
                <p className="font-medium text-[var(--isalwa-kiln)]">{pain.title}</p>
                <p className="mt-1 text-[var(--isalwa-slate)]">{pain.description}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Beat 3 — The evidence */}
      {showEvidenceBeat ? (
        <Section index={next()} title={t("storyBeats.evidence")} tone={confidenceTone} delay={0.1}>
          {readiness ? (
            <>
              <BeatSubLabel>{t("reportView.confidenceTitle")}</BeatSubLabel>
              <div className="mt-2 flex items-center gap-2">
                <ReadinessStateDot state={readiness.overallState} />
                <span
                  className={cn(
                    "text-[11px] font-medium uppercase tracking-[0.14em]",
                    TONE_INK[confidenceTone],
                  )}
                >
                  {readiness.overallStateLabel}
                </span>
              </div>
              <p className="architect-serif mt-3 text-2xl leading-snug text-[var(--isalwa-kiln)]">
                {readiness.advice.headline}
              </p>
              <p className="mt-2 text-[var(--isalwa-slate)]">
                {readiness.advice.detail}
              </p>
              {readiness.overallState !== "ready" &&
              readiness.stillLearning.length > 0 ? (
                <div className="mt-6">
                  <BeatSubLabel>{t("reportView.whatIsMissing")}</BeatSubLabel>
                  <div className="mt-3">
                    <StillLearningList assessment={readiness} limit={4} />
                  </div>
                </div>
              ) : null}

              {/*
                Explainable Confidence — the same confidence this beat opens
                with, broken into the categories a client actually asks
                about, each with why and a concrete way to raise it.
              */}
              {explainableConfidence ? (
                <div className="mt-6 border-t border-[var(--isalwa-mist)]/60 pt-5">
                  <BeatSubLabel>{t("explainableConfidence.kicker")}</BeatSubLabel>
                  <div className="mt-3">
                    <ExplainableConfidenceBreakdown report={explainableConfidence} />
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {hasContradictions ? (
            <div className={readiness ? "mt-6" : undefined}>
              <BeatSubLabel>{t("reportView.pointsToClarify")}</BeatSubLabel>
              <ul className="mt-2 space-y-2">
                {(report.consultingContradictions ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Section>
      ) : null}

      {/* Beat 4 — Business impact */}
      {hasBusinessImpact ? (
        <Section
          index={next()}
          title={t("storyBeats.businessImpact")}
          intro={t("reportView.storyBusinessImpactIntro")}
          delay={0.12}
        >
          <BeatSubLabel>{t("reportView.consultingAssessment")}</BeatSubLabel>
          <div className="mt-3">
            {report.consultingMaturity ? (
              <p className="mb-3">
                <span className="text-[var(--isalwa-slate)]/80">{t("reportView.maturityPrefix")}</span>
                {report.consultingMaturity}
              </p>
            ) : null}
            {report.consultingHealth ? (
              <p>
                <span className="text-[var(--isalwa-slate)]/80">{t("reportView.businessHealthPrefix")}</span>
                {report.consultingHealth}
              </p>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* Beat 5 — Risk */}
      {hasEvidencedRisk ? (
        <Section index={next()} title={t("storyBeats.risk")} tone="red" delay={0.14}>
          <BeatSubLabel>{t("reportView.riskPatterns")}</BeatSubLabel>
          <ul className="mt-2 space-y-2">
            {(report.consultingRisks ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          {visibleGeneralRisks.length > 0 ? (
            <div className="mt-5">
              <BeatSubLabel>{t("reportView.risks")}</BeatSubLabel>
              <ul className="mt-2 space-y-2">
                {visibleGeneralRisks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Section>
      ) : null}

      {/* Beat 6 — Opportunity */}
      {hasOpportunityContent ? (
        <Section
          index={next()}
          title={t("storyBeats.opportunity")}
          intro={t("reportView.recommendationsIntro")}
          tone="green"
          delay={0.16}
        >
          {report.consultingOpportunities && report.consultingOpportunities.length > 0 ? (
            <div>
              <BeatSubLabel>{t("reportView.opportunityHorizons")}</BeatSubLabel>
              <ul className="mt-2 space-y-2">
                {report.consultingOpportunities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {visibleOpportunities.length > 0 ? (
            <div className={report.consultingOpportunities?.length ? "mt-6" : undefined}>
              <BeatSubLabel>{t("reportView.recommendations")}</BeatSubLabel>
              <ul className="mt-3 space-y-5">
                {visibleOpportunities.map((item) => (
                  <li
                    key={item.id}
                    className="border-l-2 border-[var(--isalwa-tint-green-border)] pl-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium text-[var(--isalwa-kiln)]">{item.title}</p>
                      <span className="isalwa-status-chip shrink-0" data-tone="green">
                        {recommendationPriorityLabel(item.priority)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[var(--isalwa-slate)]">{item.rationale}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.aiOpportunities.length > 0 ? (
            <div className="mt-6">
              <BeatSubLabel>{t("reportView.aiOpportunities")}</BeatSubLabel>
              <ul className="mt-2 space-y-2">
                {report.aiOpportunities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Section>
      ) : null}

      {/* Beat 7 — Recommended investment */}
      {showInvestmentBeat ? (
        <Section index={next()} title={t("storyBeats.recommendedInvestment")} tone="violet" delay={0.18}>
          {showImplementationPlan ? (
            <div>
              <BeatSubLabel>{t("reportView.implementationPlan")}</BeatSubLabel>
              <div className="mt-3 space-y-7">
                {report.suggestedRoadmap.map((phase) => (
                  <div key={phase.id}>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
                      {phase.horizon}
                    </p>
                    <h3 className="architect-serif mt-1 text-2xl text-[var(--isalwa-kiln)]">
                      {phaseLabel(phase.name)}
                    </h3>
                    <ul className="mt-3 space-y-1 text-[var(--isalwa-slate)]">
                      {phase.outcomes.map((outcome) => (
                        <li key={outcome}>{outcome}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {report.potentialModules.length > 0 ? (
            <div className={showImplementationPlan ? "mt-6" : undefined}>
              <BeatSubLabel>{t("reportView.suggestedCapabilities")}</BeatSubLabel>
              <div className="mt-3 flex flex-wrap gap-2">
                {report.potentialModules.map((module) => (
                  <span
                    key={module.id}
                    className="isalwa-surface-gray isalwa-ink-gray rounded-full border px-3.5 py-1.5 text-sm"
                  >
                    {moduleLabel(module.name)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </Section>
      ) : null}

      {/* Beat 8 — Expected ROI */}
      <Section
        index={next()}
        title={t("storyBeats.expectedRoi")}
        intro={t("reportView.storyRoiIntro")}
        tone="teal"
        delay={0.2}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <BeatSubLabel>{t("reportView.estimatedComplexity")}</BeatSubLabel>
            <p className="architect-serif mt-2 text-3xl capitalize text-[var(--isalwa-kiln)]">
              {complexityLabel(report.estimatedComplexity)}
            </p>
          </div>
          <div>
            <BeatSubLabel>{t("reportView.estimatedTime")}</BeatSubLabel>
            <p className="architect-serif mt-2 text-3xl text-[var(--isalwa-kiln)]">
              {timelineEstimateLabel(report.estimatedTimeline)}
            </p>
          </div>
        </div>
      </Section>

      {/* Beat 9 — Next steps */}
      <Section
        index={next()}
        title={t("storyBeats.nextSteps")}
        intro={t("reportView.executiveConclusionIntro")}
        tone="blue"
        delay={0.22}
      >
        {report.unansweredQuestions.length > 0 ? (
          <div className="mb-6">
            <BeatSubLabel>{t("reportView.openQuestions")}</BeatSubLabel>
            <ul className="mt-2 space-y-2">
              {report.unansweredQuestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <BeatSubLabel>{t("reportView.executiveConclusion")}</BeatSubLabel>
        <p className="mt-2 text-lg leading-relaxed text-[var(--isalwa-slate)]">
          {report.executiveConclusion}
        </p>
      </Section>
    </div>
  );
}

export function ReportView() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const [report, setReport] = useState<DiscoveryReport | null>(null);
  const [readiness, setReadiness] = useState<ReadinessAssessment | null>(null);
  const [explainableConfidence, setExplainableConfidence] =
    useState<ExplainableConfidenceReport | null>(null);
  const [companyName, setCompanyName] = useState(t("reportView.theCompany"));
  /** White Label Company Experience — only available when the report is opened with a workspaceId (not the standalone interview fallback). */
  const [brand, setBrand] = useState<EffectiveBrandExperience | null>(null);
  const store = useMemo(() => getClientCompanyMemoryStore(), []);
  const persistence = useMemo(
    () => createClientInterviewPersistence(workspaceId),
    [workspaceId],
  );

  useEffect(() => {
    async function load() {
      if (workspaceId) {
        const workspace = await store.workspaces.get(workspaceId);
        if (workspace?.currentReport) {
          setReport(workspace.currentReport);
          setReadiness(assessReadiness(workspace));
          setExplainableConfidence(assessExplainableConfidence(workspace));
          setCompanyName(workspace.companyName);
          setBrand(
            applyBrandOverrides(
              workspace.brandExperience,
              workspace.brandOverrides,
              workspace.companyName,
            ),
          );
          return;
        }
      }
      const interview = await persistence.load();
      if (interview?.report) {
        setReport(interview.report);
        setReadiness(assessMemoryReadiness(interview.memory));
        setExplainableConfidence(
          assessMemoryExplainableConfidence(interview.memory),
        );
        setCompanyName(
          interview.business.companyName ??
            interview.participant.companyName ??
            t("reportView.company"),
        );
      }
    }
    void load();
  }, [persistence, store, workspaceId, t]);

  if (!report) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-20">
        <h1 className="architect-serif text-4xl text-[var(--isalwa-kiln)]">
          {t("reportView.noBusinessPlanYet")}
        </h1>
        <p className="mt-4 text-[var(--isalwa-slate)]">
          {t("reportView.completeDiscoverySession")}
        </p>
        <div className="mt-8">
          <BackLink
            href={workspaceId ? `/workspace/${workspaceId}` : "/"}
            label={t("reportView.backToWorkspace")}
          />
        </div>
      </main>
    );
  }

  const backHref = workspaceId ? `/workspace/${workspaceId}` : "/";

  return (
    <main className="mx-auto min-h-screen w-full max-w-[var(--isalwa-page-max-report)] px-4 py-16 sm:px-6 sm:py-20">
      <BackLink
        href={backHref}
        label={t("reportView.backToWorkspace")}
        className="mb-10"
      />

      {/* Masthead — reads as the cover of a bound report, not a page header. */}
      <header className="isalwa-enter">
        <p className="isalwa-kicker">{t("reportView.liveReport")}</p>
        <div className="mt-4 flex items-center gap-3">
          {brand?.reportBranding.showLogoOnReports && brand.logoUrl.value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl.value}
              alt={t("reportView.logoAlt", { company: companyName })}
              className="h-10 w-10 shrink-0 rounded-xl border-2 border-[var(--isalwa-mist)] bg-white object-contain p-1"
              style={
                brand.primaryColor.value
                  ? { borderColor: brand.primaryColor.value }
                  : undefined
              }
            />
          ) : null}
          <h1 className="architect-serif text-4xl leading-tight text-[var(--isalwa-kiln)] sm:text-5xl">
            {t("reportView.businessPlanOf", { company: companyName })}
          </h1>
        </div>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--isalwa-slate)]">
          {t("reportView.heroDescription")}
        </p>

        <div className="mt-8 flex items-start gap-3 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-tint-blue-border)] bg-[var(--isalwa-tint-blue)] px-5 py-4">
          <span className="isalwa-icon-chip isalwa-ink-blue !h-8 !w-8">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {t("reportView.updatesEverySession")}
          </p>
        </div>
      </header>

      {/* Report body — bound in one premium paper panel, so the whole
          document reads as a single considered artifact instead of a page
          of stacked forms. */}
      <Card className="isalwa-enter isalwa-enter-delay-1 mt-12 px-6 py-10 sm:px-12 sm:py-14">
        <ReportBody
          report={report}
          readiness={readiness}
          explainableConfidence={explainableConfidence}
        />
      </Card>

      <footer className="isalwa-divider-fade mt-16" />
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <BackLink href={backHref} label={t("reportView.backToWorkspace")} />
        <Button asChild variant="ghost">
          <Link href="/">{t("reportView.allCompanies")}</Link>
        </Button>
      </div>

      {brand?.reportBranding.footerText ? (
        <p className="mt-8 text-xs text-[var(--isalwa-slate)]/60">
          {brand.reportBranding.footerText}
        </p>
      ) : null}
    </main>
  );
}
