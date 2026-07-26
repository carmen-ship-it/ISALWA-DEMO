"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { applyBrandOverrides, type EffectiveBrandExperience } from "@/lib/brand";
import { createClientInterviewPersistence } from "@/lib/persistence";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import type { DiscoveryReport } from "@/types";

function Section({
  title,
  intro,
  children,
  delay = 0,
}: {
  title: string;
  /** One-sentence connective lead-in — frames why this section is here. Presentation only. */
  intro?: string;
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
      <div>
        <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
          {title}
        </h2>
        {intro ? (
          <p className="mt-1.5 text-sm italic text-neutral-400">{intro}</p>
        ) : null}
      </div>
      <div className="text-base leading-relaxed text-neutral-800">{children}</div>
    </motion.section>
  );
}

function recommendationPriorityLabel(
  priority: DiscoveryReport["opportunities"][number]["priority"],
): string {
  switch (priority) {
    case "now":
      return "Ahora";
    case "next":
      return "Siguiente";
    case "later":
      return "Más adelante";
    default:
      return priority;
  }
}

function ReportBody({ report }: { report: DiscoveryReport }) {
  return (
    <div className="space-y-12">
      <Section
        title="Resumen ejecutivo"
        intro="La versión en un párrafo — qué encontramos y hacia dónde lleva."
        delay={0.05}
      >
        <p>{report.executiveSummary}</p>
      </Section>

      <Separator />

      <Section title="Panorama del negocio" delay={0.08}>
        <pre className="whitespace-pre-wrap font-sans text-neutral-700">
          {report.businessSnapshot}
        </pre>
      </Section>

      {report.consultingMaturity || report.consultingHealth ? (
        <>
          <Separator />
          <Section title="Evaluación consultiva" delay={0.09}>
            {report.consultingMaturity ? (
              <p className="mb-3">
                <span className="text-neutral-500">Madurez — </span>
                {report.consultingMaturity}
              </p>
            ) : null}
            {report.consultingHealth ? (
              <p>
                <span className="text-neutral-500">Salud del negocio — </span>
                {report.consultingHealth}
              </p>
            ) : null}
          </Section>
        </>
      ) : null}

      {report.consultingRisks && report.consultingRisks.length > 0 ? (
        <>
          <Separator />
          <Section title="Patrones de riesgo" delay={0.095}>
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
          <Section title="Puntos por aclarar" delay={0.098}>
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
          <Section title="Horizontes de oportunidad" delay={0.099}>
            <ul className="space-y-2">
              {report.consultingOpportunities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>
        </>
      ) : null}

      <Separator />

      <Section title="Flujo de trabajo actual" delay={0.1}>
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

      <Section title="Sistemas actuales" delay={0.12}>
        <div className="flex flex-wrap gap-2">
          {report.currentSystems.length === 0 ? (
            <p className="text-neutral-500">Aún no se registran sistemas.</p>
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

      <Section
        title="Puntos de dolor"
        intro="Lo que encontramos — las fricciones que reveló el diagnóstico, en la realidad operativa de la empresa."
        delay={0.14}
      >
        {report.painPoints.length === 0 ? (
          <p className="text-neutral-500">
            Aún no hay puntos de dolor registrados — continúe el diagnóstico
            para identificarlos.
          </p>
        ) : (
          <ul className="space-y-3">
            {report.painPoints.map((pain) => (
              <li key={pain.id}>
                <p className="font-medium text-neutral-950">{pain.title}</p>
                <p className="mt-1 text-neutral-600">{pain.description}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Separator />

      <Section
        title="Recomendaciones"
        intro="Por qué importa y qué recomendamos — cada hallazgo junto con la acción que justifica."
        delay={0.16}
      >
        {report.opportunities.length === 0 ? (
          <p className="text-neutral-500">
            Las recomendaciones aparecerán cuando el diagnóstico tenga
            evidencia suficiente.
          </p>
        ) : (
          <ul className="space-y-4">
            {report.opportunities.map((item) => (
              <li key={item.id} className="border-b border-neutral-100 pb-4 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-neutral-950">{item.title}</p>
                  <span className="shrink-0 rounded-full border border-neutral-200 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-500">
                    {recommendationPriorityLabel(item.priority)}
                  </span>
                </div>
                <p className="mt-1.5 text-neutral-600">{item.rationale}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Separator />

      <Section title="Capacidades sugeridas" delay={0.18}>
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

      <Section title="Plan de implementación" delay={0.2}>
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
        <Section title="Complejidad estimada" delay={0.28}>
          <p className="architect-serif text-3xl capitalize text-neutral-950">
            {report.estimatedComplexity.replace("_", " ")}
          </p>
        </Section>
        <Section title="Tiempo estimado" delay={0.3}>
          <p className="architect-serif text-3xl text-neutral-950">
            {report.estimatedTimeline}
          </p>
        </Section>
      </div>

      <Separator />

      <Section title="Preguntas abiertas" delay={0.32}>
        <ul className="space-y-2">
          {report.unansweredQuestions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Separator />

      <Section title="Oportunidades de IA" delay={0.34}>
        <ul className="space-y-2">
          {report.aiOpportunities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Separator />

      <Section title="Riesgos" delay={0.35}>
        <ul className="space-y-2">
          {report.risks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Separator />

      <Section
        title="Conclusión ejecutiva"
        intro="Siguiente paso — llevar la historia a una decisión."
        delay={0.36}
      >
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
  const [companyName, setCompanyName] = useState("la empresa");
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
            "Empresa",
        );
      }
    }
    void load();
  }, [persistence, store, workspaceId]);

  if (!report) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-20">
        <h1 className="architect-serif text-4xl text-neutral-950">
          Aún no hay un plan de negocio.
        </h1>
        <p className="mt-4 text-neutral-600">
          Complete una sesión de descubrimiento para generar el informe vivo.
        </p>
        <div className="mt-8">
          <BackLink
            href={workspaceId ? `/workspace/${workspaceId}` : "/"}
            label="Volver al espacio de trabajo"
          />
        </div>
      </main>
    );
  }

  const backHref = workspaceId ? `/workspace/${workspaceId}` : "/";

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-16 sm:px-8">
      <BackLink
        href={backHref}
        label="Volver al espacio de trabajo"
        className="mb-8"
      />
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
        Informe vivo
      </p>
      <div className="mt-4 flex items-center gap-3">
        {brand?.reportBranding.showLogoOnReports && brand.logoUrl.value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl.value}
            alt={`Logo de ${companyName}`}
            className="h-10 w-10 shrink-0 rounded-xl border border-neutral-200 bg-white object-contain p-1"
          />
        ) : null}
        <h1 className="architect-serif text-5xl leading-tight text-neutral-950">
          Plan de negocio de {companyName}
        </h1>
      </div>
      <p className="mt-4 max-w-2xl text-lg text-neutral-600">
        Un plan operativo de calidad consultora que evoluciona con cada
        reunión — respaldado por evidencia, claro y útil para decidir.
      </p>

      <Card className="mt-8 px-5 py-4 text-sm text-neutral-500">
        Este informe se actualiza con cada sesión de descubrimiento. Los
        hallazgos anteriores se conservan y se combinan — nunca se descartan.
      </Card>

      <div className="mt-12">
        <ReportBody report={report} />
      </div>

      <div className="mt-16 flex flex-wrap items-center gap-4">
        <BackLink href={backHref} label="Volver al espacio de trabajo" />
        <Button asChild variant="ghost">
          <Link href="/">Todas las empresas</Link>
        </Button>
      </div>

      {brand?.reportBranding.footerText ? (
        <p className="mt-8 text-xs text-neutral-400">
          {brand.reportBranding.footerText}
        </p>
      ) : null}
    </main>
  );
}
