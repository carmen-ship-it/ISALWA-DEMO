"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArchitectNav } from "@/components/nav/architect-nav";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BusinessBlueprintPanel } from "@/components/workspace/business-blueprint-panel";
import { SolutionArchitecturePanel } from "@/components/workspace/solution-architecture-panel";
import { BusinessProcessesPanel } from "@/components/workspace/business-processes-panel";
import { DeliverablesPanel } from "@/components/workspace/deliverables-panel";
import { BrandExperiencePanel } from "@/components/workspace/brand-experience-panel";
import { AnimatedBlueprint } from "@/components/workspace/executive/animated-blueprint";
import { ConfidenceMeter } from "@/components/workspace/executive/confidence-meter";
import { DiscoveryJourney } from "@/components/workspace/executive/discovery-journey";
import { ExecutiveDashboard } from "@/components/workspace/executive/executive-dashboard";
import { ModuleInsightCards } from "@/components/workspace/executive/module-insight-cards";
import { ReasoningCards } from "@/components/workspace/executive/reasoning-cards";
import { KnowledgeCenter } from "@/components/workspace/knowledge-center";
import { SectionShell } from "@/components/workspace/section-shell";
import {
  WorkspaceTabs,
  type WorkspaceTabId,
} from "@/components/workspace/workspace-tabs";
import { useAuth } from "@/hooks/use-auth";
import { deriveExecutiveExperience } from "@/lib/executive";
import {
  explainSolutionModules,
  explainWorkspaceRecommendations,
} from "@/lib/explanations";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { buildResumeBriefing } from "@/lib/resume";
import { formatTimelineDate, sortTimelineNewestFirst } from "@/lib/timeline";
import {
  formatIndustryLabel,
  formatRelativeActivity,
  formatStageLabel,
} from "@/lib/workspace";
import type { CompanyWorkspace } from "@/types";

export function WorkspaceView({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const store = useMemo(() => getClientCompanyMemoryStore(), []);
  const [workspace, setWorkspace] = useState<CompanyWorkspace | null>(null);
  const [tab, setTab] = useState<WorkspaceTabId>("executive");

  useEffect(() => {
    let cancelled = false;
    void store.workspaces.get(workspaceId).then((next) => {
      if (!cancelled) setWorkspace(next);
    });

    // Live shared updates when Supabase Realtime is available.
    const supabaseStore = store as {
      subscribe?: (
        id: string,
        handler: (ws: CompanyWorkspace) => void,
      ) => () => void;
    };
    const unsubscribe = supabaseStore.subscribe?.(workspaceId, (next) => {
      if (!cancelled) setWorkspace(next);
    });

    const onFocus = () => {
      void store.workspaces.get(workspaceId).then((next) => {
        if (!cancelled && next) setWorkspace(next);
      });
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      unsubscribe?.();
      window.removeEventListener("focus", onFocus);
    };
  }, [store, workspaceId]);

  const executive = useMemo(
    () => (workspace ? deriveExecutiveExperience(workspace) : null),
    [workspace],
  );

  const explainedRecommendations = useMemo(
    () => (workspace ? explainWorkspaceRecommendations(workspace) : []),
    [workspace],
  );

  const explainedModules = useMemo(
    () => (workspace ? explainSolutionModules(workspace) : []),
    [workspace],
  );

  if (!workspace || !executive) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
        <p className="text-neutral-500">Cargando espacio de trabajo…</p>
      </main>
    );
  }

  const briefing = buildResumeBriefing(workspace);
  const timeline = sortTimelineNewestFirst(workspace.timeline).slice(0, 8);
  const interviewHref = `/discovery?workspaceId=${workspace.id}`;
  const roadmapPhases = workspace.solutionArchitecture?.roadmap ?? [];

  const panels: Record<WorkspaceTabId, ReactNode> = {
    executive: (
      <div className="space-y-8">
        <SectionShell
          tone="executive"
          kicker="Cabina ejecutiva"
          title="Inicio del día"
          description="La casa diaria después del onboarding: salud del negocio, riesgos abiertos, prioridades y avance — lista para decidir."
        >
          <Card className="border-sky-100/60 bg-white/80 px-6 py-6 shadow-none">
            <ConfidenceMeter value={workspace.businessUnderstanding} />
          </Card>
          <div className="mt-6">
            <Button asChild size="lg">
              <Link href={interviewHref}>{briefing.ctaLabel}</Link>
            </Button>
            {briefing.estimatedMinutesRemaining ? (
              <p className="mt-3 text-sm text-neutral-500">
                Quedan unos {briefing.estimatedMinutesRemaining} minutos de descubrimiento.
              </p>
            ) : null}
          </div>
        </SectionShell>

        <SectionShell tone="executive">
          <ExecutiveDashboard
            model={executive.dashboard}
            cockpit={executive.cockpit}
            explainedRecommendations={explainedRecommendations}
          />
        </SectionShell>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionShell
            tone="risks"
            kicker="Preguntas abiertas"
            className="sm:px-6 sm:py-6"
          >
            {workspace.openQuestions.length === 0 ? (
              <p className="text-sm text-neutral-600">
                No hay preguntas abiertas por ahora.
              </p>
            ) : (
              <ul className="space-y-2">
                {workspace.openQuestions.map((q) => (
                  <li key={q} className="text-sm leading-relaxed text-neutral-800">
                    {q}
                  </li>
                ))}
              </ul>
            )}
          </SectionShell>

          <SectionShell
            tone="health"
            kicker="Próxima reunión sugerida"
            className="sm:px-6 sm:py-6"
          >
            <p className="text-base leading-relaxed text-neutral-800">
              {workspace.suggestedNextMeeting ?? "Continuar el descubrimiento"}
            </p>
          </SectionShell>
        </div>

        {workspace.currentReport ? (
          <SectionShell
            tone="deliverables"
            kicker="Informe vivo"
            title="Narrativa para el cliente"
            description={workspace.currentReport.executiveSummary}
          >
            <Button asChild variant="secondary">
              <Link href={`/report?workspaceId=${workspace.id}`}>
                Abrir informe vivo
              </Link>
            </Button>
          </SectionShell>
        ) : null}
      </div>
    ),

    assessment: (
      <div className="space-y-8">
        <SectionShell
          tone="health"
          kicker="Diagnóstico"
          title="Avance del descubrimiento"
          description="Hasta dónde ha llegado el trabajo — y qué evidencia sostiene el panorama."
        >
          <Card className="border-emerald-100/50 bg-white/80 px-6 py-6 shadow-none">
            <DiscoveryJourney
              dayLabel={executive.dayLabel}
              stages={executive.journey}
            />
          </Card>
        </SectionShell>

        <SectionShell
          tone="executive"
          kicker="Marca y experiencia"
          title="Cómo debe sentirse la empresa"
          description="Guía de solo lectura inferida del descubrimiento — identidad, tono y expectativas de experiencia."
        >
          <BrandExperiencePanel model={workspace.brandExperience} />
        </SectionShell>

        <SectionShell
          tone="health"
          kicker="Conocimiento"
          title="Base de evidencia"
          description="Qué conocimiento de la empresa se ha incorporado al diagnóstico."
        >
          <KnowledgeCenter knowledge={workspace.knowledge} />
        </SectionShell>

        <SectionShell tone="deliverables" kicker="Actividad" title="Avance reciente">
          <ol className="space-y-5">
            {timeline.map((event) => (
              <li key={event.id} className="relative pl-6">
                <span className="absolute left-0 top-2 h-1.5 w-1.5 rounded-full bg-neutral-400" />
                <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                  {formatTimelineDate(event.date)} · {event.category}
                </p>
                <p className="mt-1 text-neutral-950">{event.title}</p>
                <p className="mt-1 text-sm text-neutral-500">
                  {event.description}
                </p>
              </li>
            ))}
          </ol>
        </SectionShell>
      </div>
    ),

    blueprint: (
      <div className="space-y-8">
        <SectionShell
          tone="blueprint"
          kicker="Modelo del negocio"
          title="Modelo operativo"
          description="Cómo opera el negocio hoy — y el estado futuro que estamos diseñando."
        >
          <AnimatedBlueprint model={executive.blueprint} />
        </SectionShell>
        <SectionShell tone="blueprint">
          <BusinessBlueprintPanel blueprints={workspace.blueprints ?? []} />
        </SectionShell>
      </div>
    ),

    architecture: (
      <SectionShell
        tone="blueprint"
        kicker="Sistemas"
        title="Sistema operativo recomendado"
        description="Las capacidades de software que el negocio necesita — diseñadas, no construidas."
      >
        <SolutionArchitecturePanel
          architecture={workspace.solutionArchitecture}
        />
      </SectionShell>
    ),

    processes: (
      <SectionShell
        tone="processes"
        kicker="Procesos"
        title="Cómo se mueve el trabajo"
        description="Flujos críticos, traspasos y oportunidades para quitar fricción."
      >
        <BusinessProcessesPanel
          context={
            workspace.businessProcesses
              ? {
                  processes: workspace.businessProcesses,
                  blueprint:
                    workspace.blueprints.find(
                      (b) => b.id === workspace.currentBlueprintId,
                    ) ??
                    workspace.blueprints[0] ??
                    null,
                  solution: workspace.solutionArchitecture,
                  knowledge: workspace.knowledge,
                  consulting:
                    workspace.conversationMemory?.consulting ?? null,
                }
              : null
          }
        />
      </SectionShell>
    ),

    recommendations: (
      <div className="space-y-8">
        <SectionShell
          tone="executive"
          kicker="Recomendaciones"
          title="Lo que recomendamos"
          description="Capacidades y fundamentos con evidencia del descubrimiento — no listas genéricas de software."
        >
          <ModuleInsightCards recommendations={explainedModules} />
        </SectionShell>
        <SectionShell tone="health">
          <ReasoningCards recommendations={explainedRecommendations} />
        </SectionShell>
        {workspace.currentReport ? (
          <SectionShell tone="deliverables" kicker="Narrative">
            <p className="text-sm text-neutral-700">
              Para la narrativa completa del cliente, abra el informe vivo.
            </p>
            <div className="mt-4">
              <Button asChild variant="secondary">
                <Link href={`/report?workspaceId=${workspace.id}`}>
                  Abrir informe vivo
                </Link>
              </Button>
            </div>
          </SectionShell>
        ) : null}
      </div>
    ),

    roadmap: (
      <SectionShell
        tone="processes"
        kicker="Hoja de ruta"
        title="Camino por fases"
        description="Una secuencia práctica desde las operaciones actuales hasta el estado futuro recomendado."
      >
        {roadmapPhases.length === 0 &&
        executive.dashboard.estimatedPhases.length === 0 ? (
          <Card className="border-orange-100/50 bg-white/80 px-5 py-5 shadow-none">
            <p className="text-sm text-neutral-600">
              La hoja de ruta aparece cuando las capacidades recomendadas
              se ordenan a partir de la evidencia del descubrimiento.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {roadmapPhases.length > 0 ? (
              <ol className="space-y-5">
                {roadmapPhases.map((phase) => (
                  <li
                    key={phase.id}
                    className="rounded-2xl border border-orange-100/60 bg-white/80 px-5 py-4"
                  >
                    <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
                      Phase {phase.phase}
                      {phase.estimatedComplexity
                        ? ` · ${phase.estimatedComplexity} complexity`
                        : ""}
                    </p>
                    <p className="mt-1 text-lg text-neutral-950">{phase.name}</p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {phase.businessValue}
                    </p>
                    {phase.modules.length > 0 ? (
                      <p className="mt-2 text-xs text-neutral-500">
                        Capacidades: {phase.modules.join(" · ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="space-y-2">
                {executive.dashboard.estimatedPhases.map((phase) => (
                  <li key={phase} className="text-sm text-neutral-800">
                    {phase}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SectionShell>
    ),

    deliverables: (
      <SectionShell
        tone="deliverables"
        kicker="Entregables"
        title="Paquete de consultoría"
        description="Documentación lista para dirección, generada desde la memoria de la empresa — para decidir, no para programar."
      >
        <DeliverablesPanel
          workspace={workspace}
          onUpdated={(next) => setWorkspace(next)}
        />
      </SectionShell>
    ),
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10 sm:px-10">
      {session?.role === "consultant" ? (
        <BackLink href="/" label="Volver a empresas" className="mb-6" />
      ) : null}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
            Espacio de la empresa
          </p>
          <h1 className="architect-serif mt-4 text-4xl leading-tight text-neutral-950 sm:text-5xl">
            {workspace.companyName}
          </h1>
          <p className="mt-3 max-w-xl text-neutral-500">
            {formatIndustryLabel(workspace.industry)} ·{" "}
            {formatStageLabel(workspace.currentStage)} ·{" "}
            {formatRelativeActivity(workspace.lastActivityAt)}
          </p>
        </div>
        <ArchitectNav
          workspaceHref={`/workspace/${workspace.id}`}
          interviewHref={interviewHref}
        />
      </header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <WorkspaceTabs active={tab} onChange={setTab} panels={panels} />
      </motion.div>

      <Separator className="my-14" />

      <div className="flex flex-wrap items-center gap-3 pb-16">
        {session?.role === "consultant" ? (
          <BackLink href="/" label="Volver a empresas" />
        ) : null}
        <Button
          variant="ghost"
          onClick={() => {
            router.push(interviewHref);
          }}
        >
          {briefing.ctaLabel}
        </Button>
      </div>
    </main>
  );
}
