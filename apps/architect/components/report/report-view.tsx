"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createLocalInterviewPersistence } from "@/lib/persistence";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import type { DiscoveryReport } from "@/types";

function Section({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className="space-y-4"
    >
      <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
        {title}
      </h2>
      <div className="text-base leading-relaxed text-neutral-800">{children}</div>
    </motion.section>
  );
}

function ReportBody({ report }: { report: DiscoveryReport }) {
  return (
    <div className="space-y-12">
      <Section title="Executive Summary" delay={0.05}>
        <p>{report.executiveSummary}</p>
      </Section>

      <Separator />

      <Section title="Business Snapshot" delay={0.08}>
        <pre className="whitespace-pre-wrap font-sans text-neutral-700">
          {report.businessSnapshot}
        </pre>
      </Section>

      {report.consultingMaturity || report.consultingHealth ? (
        <>
          <Separator />
          <Section title="Consulting Assessment" delay={0.09}>
            {report.consultingMaturity ? (
              <p className="mb-3">
                <span className="text-neutral-500">Maturity — </span>
                {report.consultingMaturity}
              </p>
            ) : null}
            {report.consultingHealth ? (
              <p>
                <span className="text-neutral-500">Business health — </span>
                {report.consultingHealth}
              </p>
            ) : null}
          </Section>
        </>
      ) : null}

      {report.consultingRisks && report.consultingRisks.length > 0 ? (
        <>
          <Separator />
          <Section title="Risk Patterns" delay={0.095}>
            <ul className="space-y-2">
              {report.consultingRisks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>
        </>
      ) : null}

      {report.consultingContradictions &&
      report.consultingContradictions.length > 0 ? (
        <>
          <Separator />
          <Section title="Items Requiring Clarification" delay={0.098}>
            <ul className="space-y-2">
              {report.consultingContradictions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>
        </>
      ) : null}

      {report.consultingOpportunities &&
      report.consultingOpportunities.length > 0 ? (
        <>
          <Separator />
          <Section title="Opportunity Horizons" delay={0.099}>
            <ul className="space-y-2">
              {report.consultingOpportunities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>
        </>
      ) : null}

      <Separator />

      <Section title="Current Workflow" delay={0.1}>
        <div className="space-y-6">
          {report.currentWorkflow.map((workflow) => (
            <div key={workflow.id}>
              <h3 className="architect-serif text-2xl text-neutral-950">
                {workflow.name}
              </h3>
              <p className="mt-2 text-neutral-600">{workflow.summary}</p>
              <ol className="mt-4 space-y-2">
                {workflow.steps.map((step) => (
                  <li key={step} className="flex gap-3 text-neutral-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Section>

      <Separator />

      <Section title="Current Systems" delay={0.12}>
        <div className="flex flex-wrap gap-2">
          {report.currentSystems.length === 0 ? (
            <p className="text-neutral-500">No systems captured.</p>
          ) : (
            report.currentSystems.map((system) => (
              <span
                key={system}
                className="rounded-full border border-neutral-200 px-3 py-1 text-sm"
              >
                {system}
              </span>
            ))
          )}
        </div>
      </Section>

      <Separator />

      <Section title="Pain Points" delay={0.14}>
        <ul className="space-y-3">
          {report.painPoints.map((pain) => (
            <li key={pain.id}>
              <p className="font-medium text-neutral-950">{pain.title}</p>
              <p className="mt-1 text-neutral-600">{pain.description}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Separator />

      <Section title="Recommendations" delay={0.16}>
        <ul className="space-y-3">
          {report.opportunities.map((item) => (
            <li key={item.id}>
              <p className="font-medium text-neutral-950">{item.title}</p>
              <p className="mt-1 text-neutral-600">{item.rationale}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Separator />

      <Section title="Suggested Modules" delay={0.18}>
        <div className="flex flex-wrap gap-2">
          {report.potentialModules.map((module) => (
            <span
              key={module.id}
              className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-800"
            >
              {module.name}
            </span>
          ))}
        </div>
      </Section>

      <Separator />

      <Section title="Roadmap" delay={0.2}>
        <div className="space-y-6">
          {report.suggestedRoadmap.map((phase) => (
            <div key={phase.id}>
              <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                {phase.horizon}
              </p>
              <h3 className="architect-serif mt-1 text-2xl text-neutral-950">
                {phase.name}
              </h3>
              <ul className="mt-3 space-y-1 text-neutral-700">
                {phase.outcomes.map((outcome) => (
                  <li key={outcome}>{outcome}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Separator />

      <div className="grid gap-8 sm:grid-cols-2">
        <Section title="Estimated Complexity" delay={0.28}>
          <p className="architect-serif text-3xl capitalize text-neutral-950">
            {report.estimatedComplexity.replace("_", " ")}
          </p>
        </Section>
        <Section title="Estimated Timeline" delay={0.3}>
          <p className="architect-serif text-3xl text-neutral-950">
            {report.estimatedTimeline}
          </p>
        </Section>
      </div>

      <Separator />

      <Section title="Questions Still Open" delay={0.32}>
        <ul className="space-y-2">
          {report.unansweredQuestions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Separator />

      <Section title="AI Opportunities" delay={0.34}>
        <ul className="space-y-2">
          {report.aiOpportunities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Separator />

      <Section title="Risks" delay={0.35}>
        <ul className="space-y-2">
          {report.risks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Separator />

      <Section title="Executive Conclusion" delay={0.36}>
        <p className="text-lg leading-relaxed text-neutral-800">
          {report.executiveConclusion}
        </p>
      </Section>
    </div>
  );
}

export function ReportView() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const [report, setReport] = useState<DiscoveryReport | null>(null);
  const [companyName, setCompanyName] = useState("Company");
  const store = useMemo(() => getClientCompanyMemoryStore(), []);
  const persistence = useMemo(
    () =>
      createLocalInterviewPersistence(
        typeof window !== "undefined" ? window.localStorage : null,
        workspaceId,
      ),
    [workspaceId],
  );

  useEffect(() => {
    async function load() {
      if (workspaceId) {
        const workspace = await store.workspaces.get(workspaceId);
        if (workspace?.currentReport) {
          setReport(workspace.currentReport);
          setCompanyName(workspace.companyName);
          return;
        }
      }
      const interview = persistence.load();
      if (interview?.report) {
        setReport(interview.report);
        setCompanyName(
          interview.business.companyName ??
            interview.participant.companyName ??
            "Company",
        );
      }
    }
    void load();
  }, [persistence, store, workspaceId]);

  if (!report) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-20">
        <h1 className="architect-serif text-4xl text-neutral-950">
          No blueprint yet.
        </h1>
        <p className="mt-4 text-neutral-600">
          Complete a discovery session to generate the living report.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href={workspaceId ? `/workspace/${workspaceId}` : "/"}>
              Back to workspace
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-16 sm:px-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
        Living Report
      </p>
      <h1 className="architect-serif mt-4 text-5xl leading-tight text-neutral-950">
        {companyName} Blueprint
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-neutral-600">
        A McKinsey-quality operating blueprint that evolves across meetings —
        evidence-backed, readable, decision-useful.
      </p>

      <Card className="mt-8 px-5 py-4 text-sm text-neutral-500">
        This report updates with each discovery session. Prior findings are
        preserved and merged — not discarded.
      </Card>

      <div className="mt-12">
        <ReportBody report={report} />
      </div>

      <div className="mt-16 flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <Link href={workspaceId ? `/workspace/${workspaceId}` : "/"}>
            Back to workspace
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">All companies</Link>
        </Button>
      </div>
    </main>
  );
}
