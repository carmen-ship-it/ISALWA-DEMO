"use client";

import { useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DELIVERABLE_EXPORT_CONTRACTS,
  generateDeliverables,
} from "@/lib/deliverables";
import { ImplementationPackagePanel } from "@/components/workspace/implementation-package-panel";
import { LivingDeliverablesCenter } from "@/components/workspace/living-deliverables-center";
import {
  Beat,
  BeatEmpty,
  BeatList,
  StoryBeats,
} from "@/components/workspace/story-beat";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "@/lib/i18n";
import {
  complexityLabel,
  departmentLabel,
  futureOutputStatusLabel,
  healthLabel,
  maturityLabel,
  recommendationStrength,
  roleLabel,
  severityLabel,
} from "@/lib/presentation";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { formatRelativeActivity } from "@/lib/workspace";
import type { CompanyWorkspace, DeliverablesPackage, LivingDeliverableKind } from "@/types";

type TabId =
  | "executive"
  | "assessment"
  | "blueprint"
  | "solution"
  | "processes"
  | "prd"
  | "roadmap"
  | "cursor"
  | "implementation"
  | "backlog"
  | "proposal"
  | "exports";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "executive", label: "Resumen ejecutivo" },
  { id: "assessment", label: "Diagnóstico del negocio" },
  { id: "blueprint", label: "Plan de negocio" },
  { id: "solution", label: "Sistema recomendado" },
  { id: "processes", label: "Procesos" },
  { id: "prd", label: "Requisitos" },
  { id: "roadmap", label: "Plan de implementación" },
  { id: "cursor", label: "Resumen de construcción" },
  { id: "implementation", label: "Plan de implementación técnica" },
  { id: "backlog", label: "Backlog de trabajo" },
  { id: "proposal", label: "Propuesta" },
  { id: "exports", label: "Opciones de exportación" },
];

/**
 * Client Mode — the polished decision documents Álvaro sees. Technical
 * build artifacts (system design, requirements, backlog, build context,
 * export formats) stay Consultant-only, per the Executive Client
 * Experience mission scope.
 */
const CLIENT_VISIBLE_DELIVERABLE_TABS: TabId[] = [
  "executive",
  "assessment",
  "blueprint",
  "roadmap",
  "proposal",
];

export function DeliverablesPanel({
  workspace,
  onUpdated,
  focusKind,
  onFocusConsumed,
  onTeach,
}: {
  workspace: CompanyWorkspace;
  onUpdated: (next: CompanyWorkspace) => void;
  /** Mission 25/27 — deep-link into a living OS artifact card. */
  focusKind?: LivingDeliverableKind | null;
  onFocusConsumed?: () => void;
  onTeach?: () => void;
}) {
  const { session } = useAuth();
  const isConsultant = session?.role === "consultant";
  const visibleTabs = isConsultant
    ? TABS
    : TABS.filter((t) => CLIENT_VISIBLE_DELIVERABLE_TABS.includes(t.id));
  const [tab, setTab] = useState<TabId>("executive");
  const [busy, setBusy] = useState(false);
  const pack = workspace.deliverables;

  const generate = async () => {
    setBusy(true);
    try {
      const nextPack = await generateDeliverables(workspace.id);
      if (!nextPack) return;
      const refreshed = await getClientCompanyMemoryStore().workspaces.get(
        workspace.id,
      );
      if (refreshed) onUpdated(refreshed);
      else
        onUpdated({
          ...workspace,
          deliverables: nextPack,
          updatedAt: nextPack.generatedAt,
          lastActivityAt: nextPack.generatedAt,
          lastActivityLabel: "Documentos generados",
        });
    } finally {
      setBusy(false);
    }
  };

  if (!pack) {
    return (
      <div className="space-y-8">
        <LivingDeliverablesCenter
          workspace={workspace}
          onUpdated={onUpdated}
          focusKind={focusKind}
          onFocusConsumed={onFocusConsumed}
          onTeach={onTeach}
        />
        <ImplementationPackagePanel
          workspace={workspace}
          onUpdated={onUpdated}
        />
        <Card className="px-5 py-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
            Documentos
          </p>
          <h3 className="architect-serif mt-3 text-3xl text-[var(--isalwa-kiln)]">
            Paquete de consultoría
          </h3>
          <p className="mt-3 text-[var(--isalwa-slate)]">
            Genere un paquete de consultoría completo a partir de la evidencia
            del diagnóstico, el plan de negocio, el sistema recomendado y los
            procesos — documentación para decidir, no software en producción.
          </p>
          <div className="mt-6">
            <Button onClick={() => void generate()} disabled={busy}>
              {busy ? "Generando…" : "Generar paquete"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <LivingDeliverablesCenter
        workspace={workspace}
        onUpdated={onUpdated}
        focusKind={focusKind}
        onFocusConsumed={onFocusConsumed}
        onTeach={onTeach}
      />
      <ImplementationPackagePanel
        workspace={workspace}
        onUpdated={onUpdated}
      />
      <Card className="px-5 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
              Documentos
            </p>
            <h3 className="architect-serif mt-3 text-3xl text-[var(--isalwa-kiln)]">
              {pack.companyName}
            </h3>
            <p className="mt-3 max-w-2xl text-[var(--isalwa-slate)]">{pack.summary}</p>
            <p className="mt-4 text-sm text-[var(--isalwa-slate)]/60">
              {recommendationStrength(pack.overallConfidence)} ·{" "}
              {formatRelativeActivity(pack.generatedAt)} · vistas previas de
              solo lectura
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => void generate()}
            disabled={busy}
          >
            {busy ? "Generando…" : "Regenerar"}
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs tracking-wide transition-colors ${
              tab === t.id
                ? "bg-[var(--isalwa-kiln)] text-white"
                : "border border-[var(--isalwa-mist)] bg-white/80 text-[var(--isalwa-slate)] hover:bg-[var(--isalwa-porcelain)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="px-6 py-6">
            <DeliverablePreview pack={pack} tab={tab} />
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DeliverablePreview({
  pack,
  tab,
}: {
  pack: DeliverablesPackage;
  tab: TabId;
}) {
  const { t } = useTranslations();
  switch (tab) {
    /**
     * Report as Business Story — the nine-beat McKinsey/Bain spine shared
     * with the Living Report (`report-view.tsx`) and the recommendation
     * cards (`explained-recommendation-card.tsx`): what we discovered → why
     * it matters → the evidence → business impact → risk → opportunity →
     * recommended investment → expected ROI → next steps. Every beat below
     * still maps 1:1 to a field `lib/deliverables/executive-summary.ts`
     * already computes (untouched by this mission) — "risk" is the one
     * addition, reusing `pack.businessAssessment.risks`, which the
     * Business Assessment tab already renders, instead of repeating
     * `biggestRisks` (kept under "business impact") under a second title.
     */
    case "executive": {
      const d = pack.executiveSummary;
      const risks = pack.businessAssessment.risks;
      return (
        <Article title="Resumen ejecutivo">
          <p className="-mt-2 text-sm text-[var(--isalwa-slate)]/80">
            {t("deliverablesExecutive.storyIntro")}
          </p>
          <StoryBeats className="mt-1 space-y-6">
            <Beat step={1} title={t("storyBeats.discovered")}>
              <p>{d.currentState}</p>
            </Beat>
            <Beat
              step={2}
              title={t("storyBeats.whyItMatters")}
              lead={t("deliverablesExecutive.whyItMattersLead")}
            >
              <BeatList items={d.problems} />
            </Beat>
            <Beat
              step={3}
              title={t("storyBeats.evidence")}
              lead={t("deliverablesExecutive.evidenceLead")}
            >
              {d.evidence.length === 0 ? (
                <BeatEmpty text={t("deliverablesExecutive.noEvidence")} />
              ) : (
                <ul className="space-y-1.5">
                  {d.evidence.map((ref) => (
                    <li key={`${ref.source}-${ref.id}`}>
                      <span className="text-[var(--isalwa-slate)]/60">[{ref.source}]</span>{" "}
                      {ref.label}
                    </li>
                  ))}
                </ul>
              )}
            </Beat>
            <Beat
              step={4}
              title={t("storyBeats.businessImpact")}
              lead={t("deliverablesExecutive.businessImpactLead")}
            >
              <BeatList items={d.biggestRisks} />
            </Beat>
            <Beat
              step={5}
              title={t("storyBeats.risk")}
              lead={t("deliverablesExecutive.riskLead")}
            >
              <BeatList
                items={risks.map((r) => `${r.title} · ${severityLabel(r.severity)}`)}
              />
            </Beat>
            <Beat
              step={6}
              title={t("storyBeats.opportunity")}
              lead={t("deliverablesExecutive.opportunityLead")}
            >
              <BeatList items={d.immediateOpportunities} />
            </Beat>
            <Beat step={7} title={t("storyBeats.recommendedInvestment")}>
              <p>{d.executiveRecommendation}</p>
              <p className="mt-2 text-[var(--isalwa-slate)]">{d.vision}</p>
              {d.investmentAreas.length > 0 ? (
                <div className="mt-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
                    {t("deliverablesExecutive.investmentAreasLabel")}
                  </p>
                  <BeatList items={d.investmentAreas} className="mt-1.5" />
                </div>
              ) : null}
            </Beat>
            <Beat
              step={8}
              title={t("storyBeats.expectedRoi")}
              lead={t("deliverablesExecutive.roiLead")}
            >
              <BeatList items={d.strategicOpportunities} />
            </Beat>
            <Beat
              step={9}
              title={t("storyBeats.nextSteps")}
              lead={t("deliverablesExecutive.nextStepsLead")}
            >
              <BeatList items={d.recommendedRoadmap} />
            </Beat>
          </StoryBeats>
        </Article>
      );
    }
    case "assessment": {
      const d = pack.businessAssessment;
      return (
        <Article title="Diagnóstico del negocio">
          <List title="Procesos actuales" items={d.currentProcesses} />
          <List title="Departamentos" items={d.departments.map(departmentLabel)} />
          <Meta
            label="Madurez operativa"
            value={maturityLabel(d.overallMaturity, "percent")}
          />
          <Meta
            label="Salud del negocio"
            value={healthLabel(d.overallHealth, "percent")}
          />
          <List title="Puntos de dolor" items={d.painPoints} />
          <List
            title="Riesgos"
            items={d.risks.map((r) => `${r.title} · ${severityLabel(r.severity)}`)}
          />
          <List title="Oportunidades de automatización" items={d.automationOpportunities} />
        </Article>
      );
    }
    case "blueprint": {
      const d = pack.businessBlueprint;
      if (!d) return <Empty label="El plan de negocio aún no está disponible" />;
      return (
        <Article title="Plan de negocio">
          <Section title="Resumen" body={d.summary} />
          <List title="Capacidades" items={d.capabilities} />
          <List title="Departamentos" items={d.departments} />
          <List title="Flujos de trabajo" items={d.workflows} />
          <List title="Información central" items={d.entities} />
          <List title="Sistemas" items={d.systems} />
          <List title="Reglas operativas" items={d.operatingRules} />
          <List title="Capacidades recomendadas" items={d.modules} />
        </Article>
      );
    }
    case "solution": {
      const d = pack.solutionArchitecture;
      if (!d) return <Empty label="El sistema recomendado aún no está disponible" />;
      return (
        <Article title="Sistema recomendado">
          <Section title="Resumen" body={d.summary} />
          <List title="Capacidades" items={d.modules} />
          <List title="Información central" items={d.entities} />
          <List title="Relaciones" items={d.relationships} />
          <List title="Roles" items={d.roles} />
          <List title="Principios de acceso" items={d.permissions} />
          <List title="Navegación" items={d.navigation} />
          <List title="Integraciones" items={d.integrations} />
          <List title="Plan de implementación" items={d.roadmap} />
        </Article>
      );
    }
    case "processes": {
      const d = pack.processBook;
      if (!d) return <Empty label="El libro de procesos aún no está disponible" />;
      return (
        <Article title="Libro de procesos">
          <Section title="Resumen" body={d.summary} />
          <p className="mt-2 text-xs text-[var(--isalwa-slate)]/60">
            Para diagramas interactivos, abra la pestaña Cómo opera en este
            espacio de trabajo.
          </p>
          {d.workflows.map((wf) => (
            <div key={wf.id} className="mt-6 border-t border-[var(--isalwa-mist)]/70 pt-5">
              <p className="text-lg text-[var(--isalwa-kiln)]">{wf.name}</p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">{wf.purpose}</p>
              <ol className="mt-3 space-y-1.5">
                {wf.steps.map((s) => (
                  <li key={`${wf.id}-${s.order}`} className="text-sm text-[var(--isalwa-slate)]">
                    {s.order}. {s.name} · {s.actor}
                    {s.manual ? " · manual" : ""}
                    {s.duration ? ` · ${s.duration}` : ""}
                  </li>
                ))}
              </ol>
              <List title="Aprobaciones" items={wf.approvals} />
              <List title="Actores" items={wf.actors} />
              <List title="Automatización" items={wf.automationOpportunities} />
            </div>
          ))}
        </Article>
      );
    }
    case "prd": {
      const d = pack.prd;
      return (
        <Article title="Requisitos del producto">
          <List title="Objetivos" items={d.goals} />
          <List title="Usuarios" items={d.users.map(roleLabel)} />
          <List title="Requisitos funcionales" items={d.functionalRequirements} />
          <List
            title="Requisitos no funcionales"
            items={d.nonFunctionalRequirements}
          />
          <List title="Criterios de aceptación" items={d.acceptanceCriteria} />
          <List title="Dependencias" items={d.dependencies} />
          <List title="Alcance futuro" items={d.futureScope} />
          <List title="Fuera de alcance" items={d.outOfScope} />
          <List title="Riesgos" items={d.risks} />
          <div className="mt-6 border-t border-[var(--isalwa-mist)]/70 pt-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
              Conceptos de diseño del sistema
            </p>
            <List
              title="Capacidades del sistema"
              items={pack.technicalArchitecture.systemModules}
            />
            <List
              title="Conceptos de información"
              items={pack.technicalArchitecture.databaseConcepts}
            />
            <List
              title="Conceptos de conectividad"
              items={pack.technicalArchitecture.apiConcepts}
            />
            <List
              title="Integraciones"
              items={pack.technicalArchitecture.integrations}
            />
          </div>
        </Article>
      );
    }
    case "roadmap": {
      const d = pack.developmentRoadmap;
      return (
        <Article title="Plan de implementación">
          {d.phases.map((p) => (
            <div key={p.phase} className="mt-5 first:mt-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
                Fase {p.phase} · complejidad {complexityLabel(p.complexity)}
              </p>
              <p className="mt-1 text-lg text-[var(--isalwa-kiln)]">{p.name}</p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">{p.businessValue}</p>
              <List title="Objetivos" items={p.goals} />
              <List title="Capacidades" items={p.modules} />
            </div>
          ))}
          <List title="Futuro" items={d.future} />
        </Article>
      );
    }
    case "cursor": {
      const d = pack.cursorContext;
      return (
        <Article title="Resumen de construcción">
          <Section title="Propósito" body={d.purpose} />
          <List title="Capacidades centrales" items={d.coreModules} />
          <List title="Reglas de negocio" items={d.businessRules} />
          <List title="Flujos críticos" items={d.criticalWorkflows} />
          <List title="Restricciones importantes" items={d.importantConstraints} />
          <List title="Lenguaje del dominio" items={d.domainLanguage} />
          <List title="Medidas de éxito" items={d.successMetrics} />
          <List title="Fuera de límites" items={d.doNot} />
          <div className="mt-6 rounded-2xl border border-[var(--isalwa-mist)] bg-[var(--isalwa-tint-gray)]/80 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
              Narrativa general
            </p>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--isalwa-slate)]">
              {d.narrative}
            </pre>
          </div>
        </Article>
      );
    }
    case "implementation": {
      const d = pack.implementationPlan;
      return (
        <Article title="Plan de implementación técnica">
          {d.phases.map((p) => (
            <div key={p.name} className="mt-5 first:mt-0">
              <p className="text-lg text-[var(--isalwa-kiln)]">{p.name}</p>
              <List title="Objetivos" items={p.objectives} />
              <List title="Frentes de trabajo" items={p.workstreams} />
              <List title="Criterios de cierre" items={p.exitCriteria} />
            </div>
          ))}
          <List title="Riesgos" items={d.risks} />
        </Article>
      );
    }
    case "backlog": {
      const d = pack.sprintBacklog;
      return (
        <Article title="Backlog de trabajo">
          {d.epics.map((epic) => (
            <div key={epic.id} className="mt-5 first:mt-0">
              <p className="text-lg text-[var(--isalwa-kiln)]">{epic.title}</p>
              {epic.features.map((f) => (
                <div key={f.id} className="mt-3 pl-3">
                  <p className="text-sm font-medium text-[var(--isalwa-slate)]">{f.title}</p>
                  <ul className="mt-2 space-y-2">
                    {f.stories.map((s) => (
                      <li key={s.id} className="text-sm text-[var(--isalwa-slate)]">
                        <span className="text-[var(--isalwa-slate)]/60">{s.priority}</span>{" "}
                        {s.title}
                        <ul className="mt-1 space-y-0.5 pl-4 text-xs text-[var(--isalwa-slate)]/60">
                          {s.acceptanceCriteria.map((c) => (
                            <li key={c}>✓ {c}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </Article>
      );
    }
    case "proposal": {
      const d = pack.proposal;
      return (
        <Article title={d.title}>
          <Section title="Alcance del encargo" body={d.engagementSummary} />
          <Section title="Enfoque recomendado" body={d.recommendedApproach} />
          <List title="Alcance" items={d.scope} />
          <List title="Cronograma" items={d.timelineOutline} />
          <Section title="Inversión" body={d.investmentNarrative} />
          <List title="Próximos pasos" items={d.nextSteps} />
        </Article>
      );
    }
    case "exports":
      return <ExportsPreview />;
    default:
      return null;
  }
}

function ExportsPreview() {
  const contracts = useMemo(() => DELIVERABLE_EXPORT_CONTRACTS, []);
  return (
    <Article title="Opciones de exportación">
      <p className="text-sm text-[var(--isalwa-slate)]/80">
        Formatos de exportación planeados para la entrega al cliente —
        disponibles en una versión posterior.
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {contracts.map((c) => (
          <li
            key={c.id}
            className="rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-3"
          >
            <p className="text-sm text-[var(--isalwa-kiln)]">{c.title}</p>
            <p className="mt-1 text-xs text-[var(--isalwa-slate)]/80">{c.description}</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
              {futureOutputStatusLabel(c.status)}
            </p>
          </li>
        ))}
      </ul>
    </Article>
  );
}

export function Article({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article>
      <h4 className="architect-serif text-2xl text-[var(--isalwa-kiln)]">{title}</h4>
      <div className="mt-5 space-y-5">{children}</div>
    </article>
  );
}

export function Section({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
        {title}
      </p>
      <p className="mt-2 text-base leading-relaxed text-[var(--isalwa-slate)]">{body}</p>
    </section>
  );
}

export function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Meta({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-[var(--isalwa-slate)]">
      <span className="text-[var(--isalwa-slate)]/60">{label}:</span> {value}
    </p>
  );
}

export function Empty({ label }: { label: string }) {
  return <p className="text-sm text-[var(--isalwa-slate)]/80">{label}</p>;
}
