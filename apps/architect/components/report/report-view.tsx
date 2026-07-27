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
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import type { DiscoveryReport } from "@/types";
import { cn } from "@/lib/utils";

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
 */
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

function ReportBody({ report }: { report: DiscoveryReport }) {
  const { t } = useTranslations();
  let i = 0;
  const next = () => ++i;
  return (
    <div className="isalwa-section-gap">
      <Section
        index={next()}
        title={t("reportView.executiveSummary")}
        intro={t("reportView.executiveSummaryIntro")}
        tone="blue"
        delay={0.05}
      >
        <p>{report.executiveSummary}</p>
      </Section>

      <Section index={next()} title={t("reportView.businessSnapshot")} delay={0.08}>
        <pre className="whitespace-pre-wrap font-sans text-[var(--isalwa-slate)]">
          {report.businessSnapshot}
        </pre>
      </Section>

      {report.consultingMaturity || report.consultingHealth ? (
        <Section index={next()} title={t("reportView.consultingAssessment")} delay={0.09}>
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
        </Section>
      ) : null}

      {report.consultingRisks && report.consultingRisks.length > 0 ? (
        <Section index={next()} title={t("reportView.riskPatterns")} tone="red" delay={0.095}>
          <ul className="space-y-2">
            {report.consultingRisks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {report.consultingContradictions &&
      report.consultingContradictions.length > 0 ? (
        <Section index={next()} title={t("reportView.pointsToClarify")} delay={0.098}>
          <ul className="space-y-2">
            {report.consultingContradictions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {report.consultingOpportunities &&
      report.consultingOpportunities.length > 0 ? (
        <Section index={next()} title={t("reportView.opportunityHorizons")} delay={0.099}>
          <ul className="space-y-2">
            {report.consultingOpportunities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section index={next()} title={t("reportView.currentWorkflow")} delay={0.1}>
        <div className="space-y-6">
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
      </Section>

      <Section index={next()} title={t("reportView.currentSystems")} delay={0.12}>
        <div className="flex flex-wrap gap-2">
          {report.currentSystems.length === 0 ? (
            <p className="text-[var(--isalwa-slate)]/80">{t("reportView.noSystemsRegistered")}</p>
          ) : (
            report.currentSystems.map((system) => (
              <span
                key={system}
                className="isalwa-chip !cursor-default"
              >
                {system}
              </span>
            ))
          )}
        </div>
      </Section>

      <Section
        index={next()}
        title={t("reportView.painPoints")}
        intro={t("reportView.painPointsIntro")}
        tone="amber"
        delay={0.14}
      >
        {report.painPoints.length === 0 ? (
          <p className="text-[var(--isalwa-slate)]/80">
            {t("reportView.noPainPoints")}
          </p>
        ) : (
          <ul className="space-y-4">
            {report.painPoints.map((pain) => (
              <li key={pain.id}>
                <p className="font-medium text-[var(--isalwa-kiln)]">{pain.title}</p>
                <p className="mt-1 text-[var(--isalwa-slate)]">{pain.description}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        index={next()}
        title={t("reportView.recommendations")}
        intro={t("reportView.recommendationsIntro")}
        tone="green"
        delay={0.16}
      >
        {report.opportunities.length === 0 ? (
          <p className="text-[var(--isalwa-slate)]/80">
            {t("reportView.noRecommendations")}
          </p>
        ) : (
          <ul className="space-y-5">
            {report.opportunities.map((item) => (
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
        )}
      </Section>

      <Section index={next()} title={t("reportView.suggestedCapabilities")} delay={0.18}>
        <div className="flex flex-wrap gap-2">
          {report.potentialModules.map((module) => (
            <span
              key={module.id}
              className="isalwa-surface-gray isalwa-ink-gray rounded-full border px-3.5 py-1.5 text-sm"
            >
              {moduleLabel(module.name)}
            </span>
          ))}
        </div>
      </Section>

      <Section index={next()} title={t("reportView.implementationPlan")} tone="violet" delay={0.2}>
        <div className="space-y-7">
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
      </Section>

      <div className="grid gap-6 sm:grid-cols-2">
        <Section index={next()} title={t("reportView.estimatedComplexity")} delay={0.28}>
          <p className="architect-serif text-3xl capitalize text-[var(--isalwa-kiln)]">
            {complexityLabel(report.estimatedComplexity)}
          </p>
        </Section>
        <Section index={next()} title={t("reportView.estimatedTime")} delay={0.3}>
          <p className="architect-serif text-3xl text-[var(--isalwa-kiln)]">
            {timelineEstimateLabel(report.estimatedTimeline)}
          </p>
        </Section>
      </div>

      <Section index={next()} title={t("reportView.openQuestions")} delay={0.32}>
        <ul className="space-y-2">
          {report.unansweredQuestions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section index={next()} title={t("reportView.aiOpportunities")} delay={0.34}>
        <ul className="space-y-2">
          {report.aiOpportunities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section index={next()} title={t("reportView.risks")} tone="red" delay={0.35}>
        <ul className="space-y-2">
          {report.risks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section
        index={next()}
        title={t("reportView.executiveConclusion")}
        intro={t("reportView.executiveConclusionIntro")}
        tone="blue"
        delay={0.36}
      >
        <p className="text-lg leading-relaxed text-[var(--isalwa-slate)]">
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
        <ReportBody report={report} />
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
