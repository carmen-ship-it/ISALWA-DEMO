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
import {
  Beat,
  BeatEmpty,
  BeatList,
  StoryBeats,
} from "@/components/workspace/story-beat";
import { useAuth } from "@/hooks/use-auth";
import {
  healthLabel,
  maturityLabel,
  recommendationStrength,
} from "@/lib/presentation";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { formatRelativeActivity } from "@/lib/workspace";
import type { CompanyWorkspace, DeliverablesPackage } from "@/types";

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
}: {
  workspace: CompanyWorkspace;
  onUpdated: (next: CompanyWorkspace) => void;
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
        <ImplementationPackagePanel
          workspace={workspace}
          onUpdated={onUpdated}
        />
        <Card className="px-5 py-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
            Documentos
          </p>
          <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
            Paquete de consultoría
          </h3>
          <p className="mt-3 text-neutral-600">
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
      <ImplementationPackagePanel
        workspace={workspace}
        onUpdated={onUpdated}
      />
      <Card className="px-5 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
              Documentos
            </p>
            <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
              {pack.companyName}
            </h3>
            <p className="mt-3 max-w-2xl text-neutral-600">{pack.summary}</p>
            <p className="mt-4 text-sm text-neutral-400">
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
                ? "bg-neutral-950 text-white"
                : "border border-neutral-200 bg-white/80 text-neutral-600 hover:bg-neutral-50"
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
  switch (tab) {
    case "executive": {
      const d = pack.executiveSummary;
      return (
        <Article title="Resumen ejecutivo">
          <p className="-mt-2 text-sm text-neutral-500">
            Una sola historia, en orden: qué encontramos, por qué importa, la
            evidencia detrás, qué cuesta hoy, qué recomendamos, el resultado
            esperado y qué sigue.
          </p>
          <StoryBeats className="mt-1 space-y-6">
            <Beat step={1} title="Qué encontramos">
              <p>{d.currentState}</p>
            </Beat>
            <Beat
              step={2}
              title="Por qué importa"
              lead="Los problemas que justifican esta recomendación:"
            >
              <BeatList items={d.problems} />
            </Beat>
            <Beat
              step={3}
              title="La evidencia"
              lead="Así queda trazado en el expediente:"
            >
              {d.evidence.length === 0 ? (
                <BeatEmpty text="Aún no hay referencias de evidencia vinculadas." />
              ) : (
                <ul className="space-y-1.5">
                  {d.evidence.map((ref) => (
                    <li key={`${ref.source}-${ref.id}`}>
                      <span className="text-neutral-400">[{ref.source}]</span>{" "}
                      {ref.label}
                    </li>
                  ))}
                </ul>
              )}
            </Beat>
            <Beat
              step={4}
              title="Impacto en el negocio"
              lead="Esto ya está costando por no actuar:"
            >
              <BeatList items={d.biggestRisks} />
            </Beat>
            <Beat step={5} title="Solución recomendada">
              <p>{d.executiveRecommendation}</p>
              <p className="mt-2 text-neutral-600">{d.vision}</p>
              {d.investmentAreas.length > 0 ? (
                <div className="mt-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                    Áreas de inversión
                  </p>
                  <BeatList items={d.investmentAreas} className="mt-1.5" />
                </div>
              ) : null}
            </Beat>
            <Beat
              step={6}
              title="Resultado esperado"
              lead="El retorno si actuamos sobre esto:"
            >
              {d.immediateOpportunities.length > 0 ? (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                    Inmediato
                  </p>
                  <BeatList items={d.immediateOpportunities} className="mt-1.5" />
                </div>
              ) : null}
              {d.strategicOpportunities.length > 0 ? (
                <div className="mt-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                    Estratégico
                  </p>
                  <BeatList items={d.strategicOpportunities} className="mt-1.5" />
                </div>
              ) : null}
            </Beat>
            <Beat
              step={7}
              title="Próximo paso"
              lead="La secuencia recomendada:"
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
          <List title="Departamentos" items={d.departments} />
          <Meta
            label="Madurez operativa"
            value={maturityLabel(d.overallMaturity)}
          />
          <Meta
            label="Salud del negocio"
            value={healthLabel(d.overallHealth)}
          />
          <List title="Puntos de dolor" items={d.painPoints} />
          <List
            title="Riesgos"
            items={d.risks.map((r) => `${r.title} · ${r.severity}`)}
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
          <p className="mt-2 text-xs text-neutral-400">
            Para diagramas interactivos, abra la pestaña Cómo opera en este
            espacio de trabajo.
          </p>
          {d.workflows.map((wf) => (
            <div key={wf.id} className="mt-6 border-t border-neutral-100 pt-5">
              <p className="text-lg text-neutral-950">{wf.name}</p>
              <p className="mt-1 text-sm text-neutral-500">{wf.purpose}</p>
              <ol className="mt-3 space-y-1.5">
                {wf.steps.map((s) => (
                  <li key={`${wf.id}-${s.order}`} className="text-sm text-neutral-700">
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
          <List title="Usuarios" items={d.users} />
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
          <div className="mt-6 border-t border-neutral-100 pt-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
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
              <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
                Fase {p.phase} · {p.complexity}
              </p>
              <p className="mt-1 text-lg text-neutral-950">{p.name}</p>
              <p className="mt-1 text-sm text-neutral-500">{p.businessValue}</p>
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
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-stone-50/80 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
              Narrativa general
            </p>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-700">
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
              <p className="text-lg text-neutral-950">{p.name}</p>
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
              <p className="text-lg text-neutral-950">{epic.title}</p>
              {epic.features.map((f) => (
                <div key={f.id} className="mt-3 pl-3">
                  <p className="text-sm font-medium text-neutral-800">{f.title}</p>
                  <ul className="mt-2 space-y-2">
                    {f.stories.map((s) => (
                      <li key={s.id} className="text-sm text-neutral-600">
                        <span className="text-neutral-400">{s.priority}</span>{" "}
                        {s.title}
                        <ul className="mt-1 space-y-0.5 pl-4 text-xs text-neutral-400">
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
      <p className="text-sm text-neutral-500">
        Formatos de exportación planeados para la entrega al cliente —
        disponibles en una versión posterior.
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {contracts.map((c) => (
          <li
            key={c.id}
            className="rounded-2xl border border-neutral-200/80 bg-white/70 px-4 py-3"
          >
            <p className="text-sm text-neutral-900">{c.title}</p>
            <p className="mt-1 text-xs text-neutral-500">{c.description}</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-neutral-400">
              {c.status}
            </p>
          </li>
        ))}
      </ul>
    </Article>
  );
}

function Article({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article>
      <h4 className="architect-serif text-2xl text-neutral-950">{title}</h4>
      <div className="mt-5 space-y-5">{children}</div>
    </article>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
        {title}
      </p>
      <p className="mt-2 text-base leading-relaxed text-neutral-700">{body}</p>
    </section>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm leading-relaxed text-neutral-700">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-neutral-600">
      <span className="text-neutral-400">{label}:</span> {value}
    </p>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-neutral-500">{label}</p>;
}
