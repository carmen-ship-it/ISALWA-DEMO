"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Building2,
  ClipboardList,
  FileText,
  GitBranch,
  Layers3,
  Lightbulb,
  Map,
  Network,
  Route,
  Sparkles,
} from "lucide-react";
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
import { BusinessKnowledge } from "@/components/workspace/business-knowledge";
import { BrandSettingsPanel } from "@/components/workspace/brand-settings-panel";
import { ExecutiveSimulatorPanel } from "@/components/workspace/executive-simulator-panel";
import { CompanyEvolutionPanel } from "@/components/workspace/company-evolution-panel";
import { CompanyModelPanel } from "@/components/workspace/company-model-panel";
import { AnimatedBlueprint } from "@/components/workspace/executive/animated-blueprint";
import { ContextBar } from "@/components/workspace/executive/context-bar";
import { DiscoveryCelebration } from "@/components/workspace/executive/discovery-celebration";
import { DiscoveryJourney } from "@/components/workspace/executive/discovery-journey";
import { ExecutiveDashboard } from "@/components/workspace/executive/executive-dashboard";
import { ExecutiveInsightsPanel } from "@/components/workspace/executive/executive-insights-panel";
import {
  GuidedJourney,
  type GuidedJourneyStage,
} from "@/components/workspace/executive/guided-journey";
import { ModuleInsightCards } from "@/components/workspace/executive/module-insight-cards";
import { ReadinessGateCard } from "@/components/workspace/executive/readiness-panel";
import { ReasoningCards } from "@/components/workspace/executive/reasoning-cards";
import { KnowledgeCenter } from "@/components/workspace/knowledge-center";
import { NextStepCta } from "@/components/workspace/next-step-cta";
import {
  RoadmapTimeline,
  type RoadmapTimelineItem,
} from "@/components/workspace/roadmap-timeline";
import { SectionShell } from "@/components/workspace/section-shell";
import { WelcomeBanner } from "@/components/workspace/welcome-banner";
import {
  CLIENT_TAB_LABELS,
  CLIENT_VISIBLE_TAB_IDS,
  WorkspaceTabs,
  type WorkspaceTabId,
} from "@/components/workspace/workspace-tabs";
import { useAuth } from "@/hooks/use-auth";
import { applyBrandOverrides } from "@/lib/brand";
import { evolveCompanyHistory } from "@/lib/history";
import { deriveExecutiveExperience, type JourneyStageId } from "@/lib/executive";
import { deriveExecutiveInsights } from "@/lib/insights";
import {
  explainSolutionModules,
  explainWorkspaceRecommendations,
} from "@/lib/explanations";
import { assessReadiness, blueprintReadinessGate } from "@/lib/readiness";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { buildResumeBriefing } from "@/lib/resume";
import { formatTimelineDate, sortTimelineNewestFirst } from "@/lib/timeline";
import {
  formatIndustryLabel,
  formatRelativeActivity,
  formatStageLabel,
} from "@/lib/workspace";
import type { CompanyWorkspace } from "@/types";

/**
 * Guided Journey — maps the five-stage consulting journey to the tab where
 * that stage lives, per role. Client Mode never points at a hidden tab
 * (Diagnóstico, Sistema recomendado, Cómo opera stay Consultant-only).
 */
function journeyStageTab(
  id: JourneyStageId,
  isConsultant: boolean,
): WorkspaceTabId {
  if (isConsultant) {
    switch (id) {
      case "interview":
        return "assessment";
      case "learned":
        return "blueprint";
      case "problems":
        return "company";
      case "architecture":
        return "architecture";
      case "recommended":
        return "recommendations";
    }
  }
  switch (id) {
    case "interview":
      return "executive";
    case "learned":
      return "blueprint";
    case "problems":
      return "recommendations";
    case "architecture":
      return "roadmap";
    case "recommended":
      return "deliverables";
  }
}

const ROADMAP_LANES = ["Hoy", "Siguiente", "30 días", "90 días", "Futuro"] as const;

export function WorkspaceView({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const store = useMemo(() => getClientCompanyMemoryStore(), []);
  const [workspace, setWorkspace] = useState<CompanyWorkspace | null>(null);
  const [tab, setTab] = useState<WorkspaceTabId>("executive");

  useEffect(() => {
    let cancelled = false;

    const loadAndEvolve = async () => {
      const next = await store.workspaces.get(workspaceId);
      if (!next || cancelled) return;

      const { workspace: evolved } = evolveCompanyHistory(next);
      const historyChanged =
        JSON.stringify(next.evolutionHistory ?? null) !==
        JSON.stringify(evolved.evolutionHistory);

      if (historyChanged) {
        const saved = await store.workspaces.save(evolved);
        if (!cancelled) setWorkspace(saved);
      } else if (!cancelled) {
        setWorkspace(next);
      }
    };

    void loadAndEvolve();

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
      void loadAndEvolve();
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

  const executiveInsights = useMemo(
    () => (workspace ? deriveExecutiveInsights(workspace) : null),
    [workspace],
  );

  /**
   * Consultant Readiness Engine — one assessment per workspace load, shared
   * by the Dashboard's "Qué seguimos aprendiendo" section and the Blueprint
   * gate so both always tell the client the same story.
   */
  const readiness = useMemo(
    () => (workspace ? assessReadiness(workspace) : null),
    [workspace],
  );

  /** White Label Company Experience — merges consultant overrides onto the derived brand model. */
  const effectiveBrand = useMemo(
    () =>
      workspace
        ? applyBrandOverrides(
            workspace.brandExperience,
            workspace.brandOverrides,
            workspace.companyName,
          )
        : null,
    [workspace],
  );

  if (
    !workspace ||
    !executive ||
    !effectiveBrand ||
    !executiveInsights ||
    !readiness
  ) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
        <p className="text-[var(--isalwa-slate)]/80">Cargando…</p>
      </main>
    );
  }

  const isConsultant = session?.role === "consultant";
  const visibleTabIds = isConsultant ? undefined : CLIENT_VISIBLE_TAB_IDS;
  const tabLabelOverrides = isConsultant ? undefined : CLIENT_TAB_LABELS;

  const briefing = buildResumeBriefing(workspace);
  const timeline = sortTimelineNewestFirst(workspace.timeline).slice(0, 5);
  const interviewHref = `/discovery?workspaceId=${workspace.id}`;
  const preparationHref = `/preparation?workspaceId=${workspace.id}`;
  const roadmapPhases = workspace.solutionArchitecture?.roadmap ?? [];
  const displayName =
    session?.displayName?.split(" ")[0] ||
    workspace.people[0]?.name?.split(" ")[0] ||
    "equipo";

  const focusHint =
    workspace.openQuestions[0]
      ? `Hoy conviene enfocarse en: ${workspace.openQuestions[0]}.`
      : workspace.suggestedNextMeeting
        ? `Hoy conviene: ${workspace.suggestedNextMeeting}.`
        : "Hoy puede revisar lo que ya aprendimos o continuar el diagnóstico.";

  // Single source of truth for "today's recommendation" — reused by the
  // welcome brief, the context bar, and the executive dashboard headline.
  const todayRecommendation =
    executive.dashboard.executiveRecommendation ??
    executive.dashboard.priorities[0] ??
    executive.cockpit.priorities[0]?.title ??
    null;

  // Guided Executive Navigation (Mission 12) — Dashboard's single answer to
  // "¿Qué debo hacer hoy?": once there is enough evidence (same 40% bar used
  // by lib/executive/derive.ts) and something concrete to react to, point at
  // today's recommendations instead of repeating "continue the assessment"
  // forever.
  const dashboardUnderstood = workspace.businessUnderstanding >= 40;
  const dashboardHasRecommendations =
    explainedRecommendations.length > 0 || explainedModules.length > 0;
  const showTodaysRecommendations =
    dashboardUnderstood && dashboardHasRecommendations;
  const dashboardPrimaryLabel = showTodaysRecommendations
    ? "Revisar recomendaciones de hoy"
    : briefing.ctaLabel;
  const goToTodaysRecommendations = showTodaysRecommendations
    ? () => setTab("recommendations")
    : undefined;

  const blueprintGate = blueprintReadinessGate(readiness);

  const guidedJourneyStages: GuidedJourneyStage[] = executive.journey.map(
    (stage) => ({
      id: stage.id,
      label: stage.label,
      detail: stage.detail,
      complete: stage.complete,
      tab: journeyStageTab(stage.id, isConsultant),
    }),
  );

  const scrollToExecutiveSummary = () => {
    if (typeof document === "undefined") return;
    document
      .getElementById("cabina-ejecutiva")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const evidenceChips = [
    workspace.meetings.length > 0
      ? `${workspace.meetings.length} reunión${workspace.meetings.length === 1 ? "" : "es"}`
      : null,
    workspace.observations.length > 0
      ? `${workspace.observations.length} hallazgos`
      : null,
    workspace.painPoints.length > 0
      ? `${workspace.painPoints.length} problemas detectados`
      : null,
    (workspace.knowledge?.assets?.length ?? 0) > 0
      ? `${workspace.knowledge!.assets.length} documentos revisados`
      : null,
  ].filter(Boolean) as string[];

  const roadmapItems: RoadmapTimelineItem[] =
    roadmapPhases.length > 0
      ? roadmapPhases.map((phase, index) => ({
          id: phase.id,
          label: ROADMAP_LANES[Math.min(index, ROADMAP_LANES.length - 1)]!,
          title: phase.name,
          summary: phase.businessValue,
          detail:
            phase.modules.length > 0
              ? `Incluye: ${phase.modules.join(" · ")}`
              : undefined,
        }))
      : executive.dashboard.estimatedPhases.map((phase, index) => ({
          id: `est_${index}`,
          label: ROADMAP_LANES[Math.min(index, ROADMAP_LANES.length - 1)]!,
          title: phase,
          summary: "Paso sugerido a partir de lo que ya sabemos.",
        }));

  const panels: Record<WorkspaceTabId, ReactNode> = {
    executive: (
      // Mission 13 — Executive Dashboard Redesign. The Dashboard reads as a
      // consulting briefing in a fixed order: 1 Today's Focus (hero) · 2
      // Business Understanding · 3 Qué seguimos aprendiendo (Consultant
      // Readiness Engine) · 4 Top 3 Priorities · 5 Critical Risks · 6 Recent
      // Discoveries · 7 Roadmap Progress · 8 Recommended Systems · 9
      // Upcoming Consultant Actions. Everything else (guided journey, open
      // questions, suggested next meeting) is real, honest content that
      // still belongs on the page — it now renders after the eight briefing
      // sections, visibly quieter, instead of interleaved with them.
      <div className="isalwa-section-gap">
        <DiscoveryCelebration
          workspaceId={workspace.id}
          companyName={workspace.companyName}
          understanding={workspace.businessUnderstanding}
        />

        {/* 1 · Today's Focus — hero, integrates Mission 12's next-action guidance. */}
        <WelcomeBanner
          displayName={displayName}
          understanding={workspace.businessUnderstanding}
          focusHint={focusHint}
          todayRecommendation={todayRecommendation}
          estimatedMinutes={briefing.estimatedMinutesRemaining}
          continueHref={interviewHref}
          continueLabel={dashboardPrimaryLabel}
          onContinueClick={goToTodaysRecommendations}
          onExplore={scrollToExecutiveSummary}
          brandMessage={effectiveBrand.homepageMessage.value}
        />

        {/* 2–8 · the consulting briefing body. */}
        <div id="cabina-ejecutiva" className="scroll-mt-32">
          <ExecutiveDashboard
            model={executive.dashboard}
            cockpit={executive.cockpit}
            readiness={readiness}
            explainedRecommendations={explainedRecommendations}
            evidenceChips={evidenceChips}
          />
        </div>

        {/* 9 · Upcoming Consultant Actions. */}
        <SectionShell
          tone="deliverables"
          icon={ClipboardList}
          kicker="9 · Próximas acciones"
          title={
            isConsultant ? "Qué sigue para el consultor" : "Qué sigue para su equipo"
          }
          description="Decisiones que aún no se han cerrado y el siguiente paso recomendado."
        >
          <CockpitDecisionsList decisions={executive.cockpit.pendingDecisions} />

          <div className="mt-6 border-t border-[var(--isalwa-mist)]/60 pt-6">
            <NextStepCta
              title="¿Qué debo hacer hoy?"
              description={
                showTodaysRecommendations
                  ? "Ya sabemos lo suficiente para sugerir qué construir primero."
                  : "Siga el diagnóstico para subir la comprensión del negocio, o revise lo que ya encontramos."
              }
              primaryHref={interviewHref}
              primaryLabel={dashboardPrimaryLabel}
              onPrimaryClick={goToTodaysRecommendations}
              secondaryHref={`/report?workspaceId=${workspace.id}`}
              secondaryLabel="Ver informe"
              tertiaryHref={isConsultant ? preparationHref : undefined}
              tertiaryLabel={isConsultant ? "Preparar la próxima reunión" : undefined}
            />
          </div>
        </SectionShell>

        {/* Secondary — everything else, visibly quieter than the briefing above. */}
        <div className="space-y-8 border-t border-[var(--isalwa-mist)]/50 pt-10">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/60">
              Su progreso
            </p>
            <div className="mt-4">
              <GuidedJourney
                stages={guidedJourneyStages}
                activeTab={tab}
                onSelectStage={setTab}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionShell
              tone="problems"
              icon={Lightbulb}
              kicker="Lo que aún falta"
              title="Preguntas abiertas"
              description="Temas que todavía necesitamos aclarar."
              className="sm:px-6 sm:py-6"
            >
              {workspace.openQuestions.length === 0 ? (
                <p className="text-sm text-[var(--isalwa-slate)]">
                  Por ahora no hay preguntas abiertas.
                </p>
              ) : (
                <ul className="space-y-2">
                  {workspace.openQuestions.slice(0, 5).map((q) => (
                    <li
                      key={q}
                      className="rounded-2xl bg-white/80 px-4 py-3 text-sm leading-relaxed text-[var(--isalwa-slate)] ring-1 ring-[var(--isalwa-tint-amber-border)]/80"
                    >
                      {q}
                    </li>
                  ))}
                </ul>
              )}
            </SectionShell>

            <SectionShell
              tone="health"
              icon={Map}
              kicker="Siguiente paso"
              title="Qué conviene hacer"
              description="Una sugerencia clara para la próxima conversación."
              className="sm:px-6 sm:py-6"
            >
              <p className="text-base leading-relaxed text-[var(--isalwa-slate)]">
                {workspace.suggestedNextMeeting ?? "Continuar el diagnóstico"}
              </p>
            </SectionShell>
          </div>
        </div>
      </div>
    ),

    assessment: (
      <div className="space-y-8">
        <NextStepCta
          title="Ayúdame a responder preguntas"
          description="Continúe donde lo dejamos — cada respuesta fortalece el diagnóstico."
          primaryHref={interviewHref}
          primaryLabel={briefing.ctaLabel}
          tertiaryHref={isConsultant ? preparationHref : undefined}
          tertiaryLabel={isConsultant ? "Preparar la próxima reunión" : undefined}
        />
        <SectionShell
          tone="health"
          icon={ClipboardList}
          kicker="Diagnóstico"
          title="Avance del trabajo"
          description="Hasta dónde hemos llegado y qué evidencia lo respalda."
        >
          <Card className="border-[var(--isalwa-tint-green-border)]/50 bg-white/80 px-6 py-6 shadow-none">
            <DiscoveryJourney
              dayLabel={executive.dayLabel}
              stages={executive.journey}
            />
          </Card>
        </SectionShell>

        <SectionShell
          tone="executive"
          icon={GitBranch}
          kicker="Evolución"
          title="Cómo ha cambiado la empresa"
          description="Cada visita suma memoria. No borramos lo anterior."
        >
          <CompanyEvolutionPanel history={workspace.evolutionHistory} />
        </SectionShell>

        <SectionShell
          tone="blueprint"
          icon={Building2}
          kicker="Marca y experiencia"
          title="Cómo debe sentirse la empresa"
          description="Identidad y tono inferidos del diagnóstico — solo lectura."
        >
          <BrandExperiencePanel model={workspace.brandExperience} />
        </SectionShell>

        {session?.role === "consultant" ? (
          <SectionShell
            tone="blueprint"
            icon={Building2}
            kicker="Marca blanca"
            title="Personalizar para este cliente"
            description="Ajuste logo, colores, terminología y mensaje de bienvenida — se aplican de inmediato en el espacio de trabajo y el reporte."
          >
            <BrandSettingsPanel
              workspace={workspace}
              updatedByLabel={session?.displayName ?? "Consultor"}
              onUpdated={(next) => setWorkspace(next)}
            />
          </SectionShell>
        ) : null}

        <SectionShell
          tone="health"
          icon={FileText}
          kicker="Conocimiento del negocio"
          title="Lo que ya sabemos"
          description="Información de la empresa que ya usamos en el diagnóstico."
        >
          <KnowledgeCenter
            workspace={workspace}
            onUpdated={(next) => setWorkspace(next)}
          />
        </SectionShell>

        <SectionShell
          tone="deliverables"
          icon={Route}
          kicker="Actividad reciente"
          title="Últimos avances"
          description="Lo más reciente que quedó registrado."
        >
          {timeline.length === 0 ? (
            <p className="text-sm text-[var(--isalwa-slate)]">
              Aún no hay actividad reciente. Continúe el diagnóstico para
              empezar.
            </p>
          ) : (
            <ol className="space-y-4">
              {timeline.map((event) => (
                <li
                  key={event.id}
                  className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/70"
                >
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
                    {formatTimelineDate(event.date)}
                  </p>
                  <p className="mt-1 text-[var(--isalwa-kiln)]">{event.title}</p>
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">
                    {event.description}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </SectionShell>

        <NextStepCta
          title="Ayúdame a responder preguntas"
          description="Responda lo que falta para fortalecer el diagnóstico."
          primaryHref={interviewHref}
          primaryLabel={briefing.ctaLabel}
        />
      </div>
    ),

    blueprint: (
      <div className="space-y-8">
        <ReadinessGateCard
          gate={blueprintGate}
          actionHref={blueprintGate.unlocked ? undefined : interviewHref}
        />
        <SectionShell
          tone="blueprint"
          icon={Layers3}
          kicker="Plan de negocio"
          title="Cómo debería operar la empresa"
          description="Este es el modelo futuro que recomendamos."
        >
          <AnimatedBlueprint model={executive.blueprint} />
        </SectionShell>
        <SectionShell tone="blueprint">
          <BusinessBlueprintPanel blueprints={workspace.blueprints ?? []} />
        </SectionShell>
        <NextStepCta
          description="Revise el sistema recomendado que da soporte a este plan."
          primaryHref="#"
          primaryLabel="Ver sistema recomendado"
          secondaryHref={interviewHref}
          secondaryLabel="Seguir evaluando"
        />
      </div>
    ),

    company: (
      <div className="space-y-8">
        <NextStepCta
          title="¿Qué saben de mi empresa?"
          description="Esto es lo que ya sabemos, construido a partir de evidencia real — no de supuestos."
          primaryHref={interviewHref}
          primaryLabel="Continuar evaluación"
          secondaryLabel="Ver conocimiento del negocio"
          onSecondaryClick={() => setTab("knowledge")}
        />
        <SectionShell
          tone="blueprint"
          icon={Network}
          kicker="Su empresa"
          title="Mapa vivo de la organización"
          description="Departamentos, relaciones, información y puntos críticos — en lenguaje claro."
        >
          <CompanyModelPanel
            model={workspace.companyModel}
            departmentNames={effectiveBrand.departmentTerminology}
          />
        </SectionShell>
        <NextStepCta
          title="¿Qué saben de mi empresa?"
          description="Si falta estructura, continúe el diagnóstico."
          primaryHref={interviewHref}
          primaryLabel="Continuar evaluación"
          secondaryLabel="Ver conocimiento del negocio"
          onSecondaryClick={() => setTab("knowledge")}
        />
      </div>
    ),

    knowledge: (
      <div className="space-y-8">
        <SectionShell
          tone="health"
          icon={FileText}
          kicker="Conocimiento del negocio"
          title="Ayúdenos a entender su negocio más rápido"
          description="Cuanta más información nos dé, menos preguntas necesitamos hacerle."
        >
          <BusinessKnowledge
            workspace={workspace}
            onUpdated={(next) => setWorkspace(next)}
          />
        </SectionShell>
        <NextStepCta
          description="Lo que suba aquí también alimenta el diagnóstico."
          primaryHref={interviewHref}
          primaryLabel="Continuar evaluación"
        />
      </div>
    ),

    insights: (
      <div className="space-y-8">
        <SectionShell
          tone="executive"
          icon={Sparkles}
          kicker="Perspectivas ejecutivas"
          title="Lo que la evidencia dice de esta empresa"
          description="Observaciones ejecutivas derivadas de lo que ya sabemos — memoria, conocimiento, historial, madurez y evidencia. Nada inventado."
        >
          <ExecutiveInsightsPanel insights={executiveInsights} />
        </SectionShell>
        <NextStepCta
          description="Estas perspectivas se enriquecen con cada respuesta y cada documento nuevo."
          primaryHref={interviewHref}
          primaryLabel="Continuar evaluación"
        />
      </div>
    ),

    architecture: (
      <div className="space-y-8">
        <SectionShell
          tone="blueprint"
          icon={Layers3}
          kicker="Sistema recomendado"
          title="Software que resuelve los problemas encontrados"
          description="Estas son las piezas de software que recomendamos — diseñadas a partir de la evidencia."
        >
          <SolutionArchitecturePanel
            architecture={workspace.solutionArchitecture}
          />
        </SectionShell>
        <NextStepCta
          description="Vea el orden sugerido para construir este sistema."
          primaryHref="#"
          primaryLabel="Ver plan de implementación"
          secondaryHref={interviewHref}
          secondaryLabel="Continuar evaluación"
        />
      </div>
    ),

    processes: (
      <div className="space-y-8">
        <SectionShell
          tone="processes"
          icon={GitBranch}
          kicker="Cómo opera"
          title="Cómo se mueve el trabajo hoy"
          description="Esto muestra cómo el trabajo atraviesa su empresa."
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
        <NextStepCta
          description="Si falta un proceso clave, continúe el diagnóstico."
          primaryHref={interviewHref}
          primaryLabel="Continuar evaluación"
        />
      </div>
    ),

    recommendations: (
      <div className="space-y-8">
        <NextStepCta
          title="¿Qué debo implementar?"
          description="Esto es lo que recomendamos construir primero, según la evidencia recolectada."
          primaryLabel="Ver plan de implementación"
          onPrimaryClick={() => setTab("roadmap")}
          secondaryHref={interviewHref}
          secondaryLabel="Continuar evaluación"
        />
        <SectionShell
          tone="executive"
          icon={Lightbulb}
          kicker="Recomendaciones"
          title="Qué recomendamos hacer"
          description="Cada recomendación nace de problemas reales que vimos — no de listas genéricas."
        >
          {explainedModules.length === 0 ? (
            <EmptyHint
              text="Aún no hay módulos de software recomendados. Continúe el diagnóstico."
              href={interviewHref}
            />
          ) : (
            <ModuleInsightCards recommendations={explainedModules.slice(0, 5)} />
          )}
        </SectionShell>
        <SectionShell tone="health" title="Más recomendaciones">
          {explainedRecommendations.length === 0 ? (
            <EmptyHint
              text="Todavía no hay recomendaciones detalladas."
              href={interviewHref}
            />
          ) : (
            <ReasoningCards
              recommendations={explainedRecommendations.slice(0, 5)}
            />
          )}
        </SectionShell>
        <NextStepCta
          title="¿Qué debo implementar?"
          description="Revise el plan de implementación o siga respondiendo preguntas."
          primaryLabel="Ver plan de implementación"
          onPrimaryClick={() => setTab("roadmap")}
          secondaryHref={interviewHref}
          secondaryLabel="Continuar evaluación"
        />
      </div>
    ),

    simulator: (
      <div className="space-y-8">
        <SectionShell
          tone="executive"
          icon={Sparkles}
          kicker="Simulador ejecutivo"
          title="¿Qué pasa si…?"
          description="Explore decisiones antes de tomarlas — sin tocar la información real de su empresa."
        >
          <ExecutiveSimulatorPanel workspace={workspace} />
        </SectionShell>
        <NextStepCta
          description="Use esto para preparar la conversación de decisión — no reemplaza el diagnóstico."
          primaryHref={interviewHref}
          primaryLabel="Continuar evaluación"
        />
      </div>
    ),

    roadmap: (
      <div className="space-y-8">
        <NextStepCta
          title="¿Hacia dónde voy?"
          description="Este plan termina en un paquete de documentos listo para decidir."
          primaryLabel="Ver documentos"
          onPrimaryClick={() => setTab("deliverables")}
          secondaryHref={interviewHref}
          secondaryLabel="Continuar evaluación"
        />
        <SectionShell
          tone="processes"
          icon={Route}
          kicker="Plan de implementación"
          title="En qué orden construir"
          description="Este es el orden que recomendamos para construir todo."
        >
          <RoadmapTimeline items={roadmapItems} />
        </SectionShell>
        <NextStepCta
          title="¿Hacia dónde voy?"
          description="Cuando el entendimiento sea suficiente, prepare el paquete de documentos."
          primaryLabel="Ver documentos"
          onPrimaryClick={() => setTab("deliverables")}
          secondaryHref={interviewHref}
          secondaryLabel="Continuar evaluación"
        />
      </div>
    ),

    deliverables: (
      <div className="space-y-8">
        <SectionShell
          tone="deliverables"
          icon={FileText}
          kicker="Documentos"
          title="Paquete para decidir"
          description="Documentos listos para dirección — para decidir, no para programar."
        >
          <DeliverablesPanel
            workspace={workspace}
            onUpdated={(next) => setWorkspace(next)}
          />
        </SectionShell>
        <NextStepCta
          description="Si falta información, vuelva al diagnóstico."
          primaryHref={interviewHref}
          primaryLabel="Continuar evaluación"
        />
      </div>
    ),
  };

  // Wire in-page CTAs that switch tabs without dead "#" links
  const panelsWithTabLinks: Record<WorkspaceTabId, ReactNode> = {
    ...panels,
    blueprint: (
      <div className="space-y-8">
        {/*
          Readiness gate — sets the expectation before the plan is read:
          Ready, or Almost Ready with the concrete conversation that would
          make it firm. It never hides the plan, it qualifies it.
        */}
        <ReadinessGateCard
          gate={blueprintGate}
          onAction={
            blueprintGate.unlocked
              ? () => setTab(isConsultant ? "architecture" : "roadmap")
              : undefined
          }
          actionHref={blueprintGate.unlocked ? undefined : interviewHref}
        />
        <SectionShell
          tone="blueprint"
          icon={Layers3}
          kicker="Plan de negocio"
          title="Cómo debería operar la empresa"
          description="Este es el modelo futuro que recomendamos."
        >
          <AnimatedBlueprint model={executive.blueprint} />
        </SectionShell>
        <SectionShell tone="blueprint">
          <BusinessBlueprintPanel blueprints={workspace.blueprints ?? []} />
        </SectionShell>
        <SectionShell tone="health" title="¿Qué debe hacer ahora?">
          <p className="mb-4 text-sm text-[var(--isalwa-slate)]">
            {isConsultant
              ? "Revise el sistema recomendado que da soporte a este plan."
              : "Revise el plan de implementación que da soporte a este modelo."}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() =>
                setTab(isConsultant ? "architecture" : "roadmap")
              }
            >
              {isConsultant
                ? "Ver sistema recomendado"
                : "Ver plan de implementación"}
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href={interviewHref}>Seguir evaluando</Link>
            </Button>
          </div>
        </SectionShell>
      </div>
    ),
    architecture: (
      <div className="space-y-8">
        <SectionShell
          tone="blueprint"
          icon={Layers3}
          kicker="Sistema recomendado"
          title="Software que resuelve los problemas encontrados"
          description="Estas son las piezas de software que recomendamos — diseñadas a partir de la evidencia."
        >
          <SolutionArchitecturePanel
            architecture={workspace.solutionArchitecture}
          />
        </SectionShell>
        <SectionShell tone="health" title="¿Qué debe hacer ahora?">
          <p className="mb-4 text-sm text-[var(--isalwa-slate)]">
            Vea el orden sugerido para construir este sistema.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={() => setTab("roadmap")}>
              Ver plan de implementación
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href={interviewHref}>Continuar evaluación</Link>
            </Button>
          </div>
        </SectionShell>
      </div>
    ),
  };

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10 sm:px-10"
      style={effectiveBrand.cssVariables}
    >
      <ContextBar
        companyName={workspace.companyName}
        stageLabel={formatStageLabel(workspace.currentStage)}
        understanding={workspace.businessUnderstanding}
        nextGoal={todayRecommendation ?? "Continuar el diagnóstico"}
      />
      {session?.role === "consultant" ? (
        <BackLink href="/" label="Volver a empresas" className="mb-6" />
      ) : null}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--isalwa-slate)]/80">
            Espacio de la empresa
          </p>
          <div className="mt-4 flex items-center gap-3">
            {effectiveBrand.logoUrl.value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={effectiveBrand.logoUrl.value}
                alt={`Logo de ${effectiveBrand.companyDisplayName}`}
                className="h-10 w-10 shrink-0 rounded-xl border-2 border-[var(--isalwa-mist)] bg-white object-contain p-1"
                style={
                  effectiveBrand.primaryColor.value
                    ? { borderColor: effectiveBrand.primaryColor.value }
                    : undefined
                }
              />
            ) : null}
            <h1 className="architect-serif text-4xl leading-tight text-[var(--isalwa-kiln)] sm:text-5xl">
              {workspace.companyName}
            </h1>
          </div>
          <p className="mt-3 max-w-xl text-[var(--isalwa-slate)]/80">
            {formatIndustryLabel(workspace.industry)} ·{" "}
            {formatStageLabel(workspace.currentStage)} ·{" "}
            {formatRelativeActivity(workspace.lastActivityAt)}
          </p>
        </div>
        <ArchitectNav
          workspaceHref={`/workspace/${workspace.id}`}
          interviewHref={interviewHref}
          preparationHref={preparationHref}
        />
      </header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <WorkspaceTabs
          active={tab}
          onChange={setTab}
          panels={panelsWithTabLinks}
          visibleTabIds={visibleTabIds}
          labelOverrides={tabLabelOverrides}
        />
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

function EmptyHint({ text, href }: { text: string; href: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--isalwa-mist)] bg-white/70 px-5 py-6">
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{text}</p>
      <div className="mt-4">
        <Button asChild variant="secondary">
          <Link href={href}>Continuar evaluación</Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Mission 13 — section 8 of the Dashboard briefing ("Upcoming Consultant
 * Actions"). Reads `cockpit.pendingDecisions` (Mission 13's own cockpit
 * pack) unchanged — no new derivation, just a dedicated presentation slot
 * instead of sharing space with quick wins/opportunities.
 */
function CockpitDecisionsList({
  decisions,
}: {
  decisions: Array<{ id: string; title: string; detail: string }>;
}) {
  if (decisions.length === 0) {
    return (
      <p className="text-sm text-[var(--isalwa-slate)]/60">
        No hay decisiones pendientes por ahora.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {decisions.map((d) => (
        <li key={d.id} className="text-sm">
          <p className="text-[var(--isalwa-slate)]">{d.title}</p>
          {d.detail ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--isalwa-slate)]/80">
              {d.detail}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
