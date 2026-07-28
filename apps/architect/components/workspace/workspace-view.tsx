"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  Plug,
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
import { CompanyBrainPanel } from "@/components/workspace/company-brain-panel";
import { BrandSettingsPanel } from "@/components/workspace/brand-settings-panel";
import { ConnectorsPanel } from "@/components/workspace/connectors-panel";
import { ExecutiveSimulatorPanel } from "@/components/workspace/executive-simulator-panel";
import { CompanyEvolutionPanel } from "@/components/workspace/company-evolution-panel";
import { CompanyModelPanel } from "@/components/workspace/company-model-panel";
import { AnimatedBlueprint } from "@/components/workspace/executive/animated-blueprint";
import { ContextBar } from "@/components/workspace/executive/context-bar";
import { DiscoveryCelebration } from "@/components/workspace/executive/discovery-celebration";
import {
  DiscoveryCompletionCard,
  capabilityInterviewHref,
} from "@/components/workspace/executive/discovery-completion-card";
import { DiscoveryJourney } from "@/components/workspace/executive/discovery-journey";
import {
  DailyBriefMilestones,
  DailyBriefRecentLearning,
  DailyBriefUnderstanding,
  ExecutiveDailyBriefHero,
  type ResolvedDailyBriefAction,
} from "@/components/workspace/executive/executive-daily-brief";
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
import { TriadBriefing } from "@/components/workspace/executive/triad-briefing";
import {
  CLIENT_TAB_LABEL_KEYS,
  CLIENT_VISIBLE_TAB_IDS,
  WORKSPACE_TAB_LABEL_KEYS,
  WorkspaceTabs,
  type WorkspaceTabId,
} from "@/components/workspace/workspace-tabs";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "@/lib/i18n";
import { applyBrandOverrides } from "@/lib/brand";
import { evolveCompanyHistory } from "@/lib/history";
import { deriveExecutiveExperience, type JourneyStageId } from "@/lib/executive";
import { deriveExecutiveInsights } from "@/lib/insights";
import {
  explainSolutionModules,
  explainWorkspaceRecommendations,
} from "@/lib/explanations";
import {
  assessExplainableConfidence,
  assessMissingInformation,
  assessReadiness,
  blueprintReadinessGate,
} from "@/lib/readiness";
import { assessCapabilityDigitalTwin } from "@/lib/discovery-agent/capabilities";
import {
  assessDiscoveryCompletion,
  buildCompanyBrain,
  buildExecutiveDailyBrief,
  buildNextStepVoice,
  groupRecentLearning,
  type DailyBriefAction,
  type DailyBriefMilestone,
} from "@/lib/consulting-intelligence";
import { dimensionToStage } from "@/lib/discovery/stages";
import { useLastVisit } from "@/hooks/use-last-visit";
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

export function WorkspaceView({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const { t } = useTranslations();
  const ROADMAP_LANES = [
    t("workspaceView.roadmapLanes.today"),
    t("workspaceView.roadmapLanes.next"),
    t("workspaceView.roadmapLanes.days30"),
    t("workspaceView.roadmapLanes.days90"),
    t("workspaceView.roadmapLanes.future"),
  ] as const;
  const store = useMemo(() => getClientCompanyMemoryStore(), []);
  const [workspace, setWorkspace] = useState<CompanyWorkspace | null>(null);
  const [tab, setTab] = useState<WorkspaceTabId>("executive");
  const [connectorBanner, setConnectorBanner] = useState<
    { provider: "google_drive" | "microsoft_365" | "quickbooks" | "hubspot"; status: string } | null
  >(null);

  /**
   * Real Integrations (Mission 23) — the Google Drive OAuth callback
   * redirects back here with `?tab=assessment&connector=google_drive&
   * connector_status=…` (see `app/api/connectors/google-drive/callback`).
   * Consumed once, then stripped from the URL so a refresh does not
   * re-show the banner or re-navigate the tab.
   */
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam in WORKSPACE_TAB_LABEL_KEYS) {
      setTab(tabParam as WorkspaceTabId);
    }
    const connectorParam = searchParams.get("connector");
    const connectorStatusParam = searchParams.get("connector_status");
    if (connectorParam && connectorStatusParam) {
      setConnectorBanner({
        provider: connectorParam as "google_drive" | "microsoft_365" | "quickbooks" | "hubspot",
        status: connectorStatusParam,
      });
      router.replace(`/workspace/${workspaceId}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /**
   * Executive Daily Brief (Mission 20) — a browser-local "what did this
   * workspace look like last time" pointer, read once per mount and
   * immediately overwritten so the *next* visit compares against *this*
   * one. Purely presentational: Discovery, Readiness, the Capability Twin,
   * Memory and the Consulting Intelligence cycle never see it.
   */
  const { previous: lastVisit } = useLastVisit(
    workspaceId,
    workspace?.businessUnderstanding ?? 0,
    workspace !== null,
  );

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

  /**
   * Missing Information Engine — the same evidence, ranked by estimated
   * business impact with a concrete next upload. Shares the Dashboard's
   * "Qué seguimos aprendiendo" section and the Knowledge tab's empty state,
   * so the client sees one consistent answer to "what should I upload next".
   */
  const missingInformation = useMemo(
    () => (workspace ? assessMissingInformation(workspace) : null),
    [workspace],
  );

  /**
   * Explainable Confidence — the same Business Understanding number above,
   * broken into the categories a client actually asks about, each with why
   * and a concrete way to raise it. Shares the same evidence as `readiness`
   * and `missingInformation` above, computed once per workspace load.
   */
  const explainableConfidence = useMemo(
    () => (workspace ? assessExplainableConfidence(workspace) : null),
    [workspace],
  );

  /**
   * Capability Digital Twin — the same evidence above, regrouped into the
   * ten client-facing business capabilities (Ventas, Operaciones,
   * Finanzas…), each with known/unknown evidence and an honest confidence
   * figure. Shares the same `EvidenceSnapshot` as `readiness` and
   * `missingInformation`, computed once per workspace load.
   */
  const capabilityTwin = useMemo(
    () => (workspace ? assessCapabilityDigitalTwin(workspace) : null),
    [workspace],
  );

  /**
   * Mission E — Discovery Complete/Incomplete ceremony. Grounded in the same
   * readiness assessment above plus the Consulting Intelligence Agent's
   * per-capability `discoveryComplete` flags (Mission G) — no new scoring,
   * just the honest verdict those two already imply together.
   */
  const discoveryCompletion = useMemo(
    () => (workspace && readiness ? assessDiscoveryCompletion(workspace, readiness) : null),
    [workspace, readiness],
  );

  /**
   * Company Brain (Mission 21 — Company Brain pass) — the client-facing
   * "what does Architect know about my company" report, composed purely
   * from the Capability Digital Twin, the Missing Information Engine and
   * the Discovery Complete ceremony already held above. No new scoring.
   */
  const companyBrain = useMemo(
    () =>
      workspace && capabilityTwin && missingInformation && discoveryCompletion
        ? buildCompanyBrain({ workspace, capabilityTwin, missingInformation, discoveryCompletion })
        : null,
    [workspace, capabilityTwin, missingInformation, discoveryCompletion],
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
    !readiness ||
    !missingInformation ||
    !explainableConfidence ||
    !capabilityTwin ||
    !discoveryCompletion ||
    !companyBrain
  ) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
        <p className="text-[var(--isalwa-slate)]/80">{t("common.loading")}</p>
      </main>
    );
  }

  const isConsultant = session?.role === "consultant";
  const visibleTabIds = isConsultant ? undefined : CLIENT_VISIBLE_TAB_IDS;
  const tabLabelOverrideKeys = isConsultant ? undefined : CLIENT_TAB_LABEL_KEYS;

  const briefing = buildResumeBriefing(workspace);
  const timeline = sortTimelineNewestFirst(workspace.timeline).slice(0, 5);
  const interviewHref = `/discovery?workspaceId=${workspace.id}`;
  const preparationHref = `/preparation?workspaceId=${workspace.id}`;
  const roadmapPhases = workspace.solutionArchitecture?.roadmap ?? [];
  const displayName =
    session?.displayName?.split(" ")[0] ||
    workspace.people[0]?.name?.split(" ")[0] ||
    "equipo";

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

  const blueprintGate = blueprintReadinessGate(readiness);

  /**
   * The always-on "what should I do next" voice (Mission 20). Composed from
   * the same readiness/missing-information/ceremony reports already held
   * above — never a second scoring model. Drives the primary action on the
   * dashboard hero, the persistent context bar, and the Executive tab's
   * closing call to action, so all three always agree.
   */
  const nextStepVoice = buildNextStepVoice({
    readiness,
    missingInformation,
    blueprintGate,
    discoveryCompletion,
  });
  const nextStepHref =
    nextStepVoice.actionKind === "focus_capability" && nextStepVoice.focusDimension
      ? `${interviewHref}&stage=${dimensionToStage(nextStepVoice.focusDimension)}`
      : nextStepVoice.actionKind === "continue_interview"
        ? interviewHref
        : undefined;
  const nextStepOnClick =
    nextStepVoice.actionKind === "upload_document"
      ? () => setTab("knowledge")
      : nextStepVoice.actionKind === "review_blueprint"
        ? () => setTab("blueprint")
        : undefined;
  /** Only "continue" or "focus a capability" belong on the Assessment tab's own CTA — an upload or Blueprint nudge belongs to its own tab, not this one. */
  const isAnsweringVoice =
    nextStepVoice.actionKind === "focus_capability" ||
    nextStepVoice.actionKind === "continue_interview";
  const assessmentPrimaryHref = isAnsweringVoice ? nextStepHref ?? interviewHref : interviewHref;
  const assessmentPrimaryLabel = isAnsweringVoice ? nextStepVoice.actionLabel : briefing.ctaLabel;

  const dashboardPrimaryLabel = showTodaysRecommendations
    ? t("workspaceView.reviewTodayRecommendations")
    : nextStepVoice.actionLabel;
  const dashboardPrimaryHref = showTodaysRecommendations
    ? interviewHref
    : nextStepHref ?? interviewHref;
  const goToTodaysRecommendations = showTodaysRecommendations
    ? () => setTab("recommendations")
    : nextStepOnClick;

  /**
   * Executive Daily Brief (Mission 20 — Executive Daily Brief pass).
   * Composes the same readiness/missing-information/ceremony reports
   * already held above, plus the browser-local last-visit pointer, into
   * the Executive tab's hero — never a second scoring model.
   */
  const dailyBrief = buildExecutiveDailyBrief({
    workspace,
    nextStepVoice,
    missingInformation,
    discoveryCompletion,
    lastVisit,
  });
  const recentLearning = groupRecentLearning(workspace);

  /** Same href/onClick resolution `nextStepHref`/`nextStepOnClick` already use above, generalized to any ranked action. */
  const dailyBriefActionHref = (action: DailyBriefAction): string | undefined => {
    if (action.actionKind === "focus_capability" && action.focusDimension) {
      return `${interviewHref}&stage=${dimensionToStage(action.focusDimension)}`;
    }
    if (action.actionKind === "continue_interview") return interviewHref;
    return undefined;
  };
  const dailyBriefActionOnClick = (action: DailyBriefAction): (() => void) | undefined => {
    if (action.actionKind === "upload_document") return () => setTab("knowledge");
    if (action.actionKind === "review_blueprint") return () => setTab("blueprint");
    return undefined;
  };

  /**
   * The primary slot keeps the already-shipped "today's recommendations are
   * ready" heuristic (`showTodaysRecommendations`) when it applies — same
   * behavior the old hero's CTA had — instead of the honest voice's own
   * top pick. Every other ranked slot is resolved normally.
   */
  const resolvedDailyBriefActions: ResolvedDailyBriefAction[] = dailyBrief.actions.map(
    (action, index) =>
      index === 0 && showTodaysRecommendations
        ? {
            id: action.id,
            message: t("workspaceView.executive.todayCtaDescriptionReady"),
            actionLabel: dashboardPrimaryLabel,
            impactLabel: null,
            href: dashboardPrimaryHref,
            onClick: goToTodaysRecommendations,
          }
        : {
            id: action.id,
            message: action.message,
            actionLabel: action.actionLabel,
            impactLabel: action.impactLabel,
            href: dailyBriefActionHref(action),
            onClick: dailyBriefActionOnClick(action),
          },
  );

  /** Reuses the exact deep-link lookup `DiscoveryCompletionCard` already exports — `null` (no dimension) becomes `undefined` (no link) for an untracked capability. */
  const milestoneHref = (milestone: DailyBriefMilestone): string | undefined =>
    capabilityInterviewHref(workspace.id, milestone.id) ?? undefined;

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
      ? t(
          workspace.meetings.length === 1
            ? "workspaceView.chips.meetingsOne"
            : "workspaceView.chips.meetingsMany",
          { count: workspace.meetings.length },
        )
      : null,
    workspace.observations.length > 0
      ? t("workspaceView.chips.findings", { count: workspace.observations.length })
      : null,
    workspace.painPoints.length > 0
      ? t("workspaceView.chips.problemsDetected", { count: workspace.painPoints.length })
      : null,
    (workspace.knowledge?.assets?.length ?? 0) > 0
      ? t("workspaceView.chips.documentsReviewed", { count: workspace.knowledge!.assets.length })
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
              ? t("workspaceView.roadmap.includes", { modules: phase.modules.join(" · ") })
              : undefined,
        }))
      : executive.dashboard.estimatedPhases.map((phase, index) => ({
          id: `est_${index}`,
          label: ROADMAP_LANES[Math.min(index, ROADMAP_LANES.length - 1)]!,
          title: phase,
          summary: t("workspaceView.roadmap.suggestedStepSummary"),
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

        {/*
          1 · Today's Focus — the Executive Daily Brief (Mission 20,
          Executive Daily Brief pass). Replaces the old `WelcomeBanner`:
          greeting + where we are, what changed since the last visit, and
          up to three ranked next actions — all composed, never invented,
          from `buildExecutiveDailyBrief` (`lib/consulting-intelligence`).
        */}
        <ExecutiveDailyBriefHero
          displayName={displayName}
          brief={dailyBrief}
          actions={resolvedDailyBriefActions}
          brandMessage={effectiveBrand.homepageMessage.value}
          onExplore={scrollToExecutiveSummary}
        />

        {/* Business Understanding — same honest number, calm animated progress, right where Álvaro looks first. */}
        <DailyBriefUnderstanding
          percent={dailyBrief.understandingPercent}
          evidenceChips={evidenceChips}
        />

        {/* Recent Learning — real workspace.timeline, grouped Hoy / Ayer / Última semana. */}
        <DailyBriefRecentLearning groups={recentLearning} />

        {/* Next Milestones — the same missing/not-tracked capabilities the ceremony card below details in full, reduced to a glanceable row. */}
        <DailyBriefMilestones milestones={dailyBrief.milestones} milestoneHref={milestoneHref} />

        {/*
          The persistent triad briefing (Mission 20) — what do we know, what
          are we trying to learn, why does it matter, composed from the
          Capability Digital Twin + Missing Information Engine reports above.
          Sits right under the brief so the three permanent client questions
          frame everything that follows on the page.
        */}
        <TriadBriefing
          whatWeKnow={capabilityTwin.headline}
          tryingToLearn={missingInformation.headline}
          whyItMatters={
            missingInformation.opportunities[0]?.rationale ?? discoveryCompletion.continuityNote
          }
        />

        {/*
          Discovery Complete/Incomplete ceremony (Mission E) — the honest
          answer to "is discovery done?", grounded in the readiness gate and
          the Capability Digital Twin's own auto-stop flags. Mission 20 —
          each open capability is a click-through straight into the guided
          interview, focused; this is the full detail behind the brief's own
          "Next Milestones" row above.
        */}
        <DiscoveryCompletionCard
          status={discoveryCompletion}
          workspaceId={workspace.id}
          companyName={workspace.companyName}
          onUploadDocuments={() => setTab("knowledge")}
          onLogMeeting={() => setTab("knowledge")}
        />

        {/* 2–8 · the consulting briefing body. */}
        <div id="cabina-ejecutiva" className="scroll-mt-32">
          <ExecutiveDashboard
            model={executive.dashboard}
            cockpit={executive.cockpit}
            readiness={readiness}
            missingInformation={missingInformation}
            explainableConfidence={explainableConfidence}
            capabilityTwin={capabilityTwin}
            onUploadClick={() => setTab("knowledge")}
            explainedRecommendations={explainedRecommendations}
            evidenceChips={evidenceChips}
          />
        </div>

        {/* 9 · Upcoming Consultant Actions. */}
        <SectionShell
          tone="deliverables"
          icon={ClipboardList}
          kicker={t("workspaceView.executive.actionsKicker")}
          title={
            isConsultant
              ? t("workspaceView.executive.actionsTitleConsultant")
              : t("workspaceView.executive.actionsTitleClient")
          }
          description={t("workspaceView.executive.actionsDescription")}
        >
          <CockpitDecisionsList decisions={executive.cockpit.pendingDecisions} />

          <div className="mt-6 border-t border-[var(--isalwa-mist)]/60 pt-6">
            <NextStepCta
              title={t("workspaceView.executive.todayCtaTitle")}
              description={
                showTodaysRecommendations
                  ? t("workspaceView.executive.todayCtaDescriptionReady")
                  : nextStepVoice.message
              }
              primaryHref={dashboardPrimaryHref}
              primaryLabel={dashboardPrimaryLabel}
              onPrimaryClick={goToTodaysRecommendations}
              secondaryHref={`/report?workspaceId=${workspace.id}`}
              secondaryLabel={t("common.viewReport")}
              tertiaryHref={isConsultant ? preparationHref : undefined}
              tertiaryLabel={isConsultant ? t("common.prepareNextMeeting") : undefined}
            />
          </div>
        </SectionShell>

        {/* Secondary — everything else, visibly quieter than the briefing above. */}
        <div className="space-y-8 border-t border-[var(--isalwa-mist)]/50 pt-10">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/60">
              {t("workspaceView.executive.progressLabel")}
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
              kicker={t("workspaceView.executive.stillMissingKicker")}
              title={t("workspaceView.executive.openQuestionsTitle")}
              description={t("workspaceView.executive.openQuestionsDescription")}
              className="sm:px-6 sm:py-6"
            >
              {workspace.openQuestions.length === 0 ? (
                <p className="text-sm text-[var(--isalwa-slate)]">
                  {t("workspaceView.executive.noOpenQuestions")}
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
              kicker={t("workspaceView.executive.nextStepKicker")}
              title={t("workspaceView.executive.nextStepTitle")}
              description={t("workspaceView.executive.nextStepDescription")}
              className="sm:px-6 sm:py-6"
            >
              <p className="text-base leading-relaxed text-[var(--isalwa-slate)]">
                {workspace.suggestedNextMeeting ?? t("common.continueDiagnosis")}
              </p>
            </SectionShell>
          </div>
        </div>
      </div>
    ),

    companyBrain: (
      <CompanyBrainPanel
        workspaceId={workspace.id}
        companyName={workspace.companyName}
        brain={companyBrain}
        recentLearning={recentLearning}
        interviewHref={interviewHref}
        onUploadDocuments={() => setTab("knowledge")}
      />
    ),

    assessment: (
      <div className="space-y-8">
        <NextStepCta
          title={t("workspaceView.assessment.helpAnswerTitle")}
          description={
            isAnsweringVoice ? nextStepVoice.message : t("workspaceView.assessment.helpAnswerDescription1")
          }
          primaryHref={assessmentPrimaryHref}
          primaryLabel={assessmentPrimaryLabel}
          tertiaryHref={isConsultant ? preparationHref : undefined}
          tertiaryLabel={isConsultant ? t("common.prepareNextMeeting") : undefined}
        />
        <SectionShell
          tone="health"
          icon={ClipboardList}
          kicker={t("workspaceView.assessment.kicker")}
          title={t("workspaceView.assessment.progressTitle")}
          description={t("workspaceView.assessment.progressDescription")}
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
          kicker={t("workspaceView.assessment.evolutionKicker")}
          title={t("workspaceView.assessment.evolutionTitle")}
          description={t("workspaceView.assessment.evolutionDescription")}
        >
          <CompanyEvolutionPanel history={workspace.evolutionHistory} />
        </SectionShell>

        <SectionShell
          tone="blueprint"
          icon={Building2}
          kicker={t("workspaceView.assessment.brandKicker")}
          title={t("workspaceView.assessment.brandTitle")}
          description={t("workspaceView.assessment.brandDescription")}
        >
          <BrandExperiencePanel model={workspace.brandExperience} />
        </SectionShell>

        {session?.role === "consultant" ? (
          <SectionShell
            tone="blueprint"
            icon={Building2}
            kicker={t("workspaceView.assessment.whiteLabelKicker")}
            title={t("workspaceView.assessment.whiteLabelTitle")}
            description={t("workspaceView.assessment.whiteLabelDescription")}
          >
            <BrandSettingsPanel
              workspace={workspace}
              updatedByLabel={session?.displayName ?? t("workspaceView.assessment.consultantFallback")}
              onUpdated={(next) => setWorkspace(next)}
            />
          </SectionShell>
        ) : null}

        {session?.role === "consultant" ? (
          <SectionShell
            tone="blueprint"
            icon={Plug}
            kicker="Integraciones reales"
            title="Conectores"
            description="Traiga evidencia directamente de las herramientas que la empresa ya usa — se procesa igual que una carga manual, sin exportar nada a mano."
          >
            <ConnectorsPanel
              workspace={workspace}
              uploadedByUserId={session?.userId ?? null}
              uploadedByName={session?.displayName ?? null}
              onUpdated={(next) => setWorkspace(next)}
              initialStatusBanner={connectorBanner}
            />
          </SectionShell>
        ) : null}

        <SectionShell
          tone="health"
          icon={FileText}
          kicker={t("common.businessKnowledgeKicker")}
          title={t("workspaceView.assessment.knownTitle")}
          description={t("workspaceView.assessment.knownDescription")}
        >
          <KnowledgeCenter
            workspace={workspace}
            onUpdated={(next) => setWorkspace(next)}
          />
        </SectionShell>

        <SectionShell
          tone="deliverables"
          icon={Route}
          kicker={t("workspaceView.assessment.recentActivityKicker")}
          title={t("workspaceView.assessment.recentActivityTitle")}
          description={t("workspaceView.assessment.recentActivityDescription")}
        >
          {timeline.length === 0 ? (
            <p className="text-sm text-[var(--isalwa-slate)]">
              {t("workspaceView.assessment.noRecentActivity")}
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
          title={t("workspaceView.assessment.helpAnswerTitle")}
          description={
            isAnsweringVoice ? nextStepVoice.message : t("workspaceView.assessment.helpAnswerDescription2")
          }
          primaryHref={assessmentPrimaryHref}
          primaryLabel={assessmentPrimaryLabel}
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
          kicker={t("common.blueprintKicker")}
          title={t("workspaceView.blueprint.title")}
          description={t("workspaceView.blueprint.description")}
        >
          <AnimatedBlueprint model={executive.blueprint} />
        </SectionShell>
        <SectionShell tone="blueprint">
          <BusinessBlueprintPanel blueprints={workspace.blueprints ?? []} />
        </SectionShell>
        <NextStepCta
          description={t("workspaceView.blueprint.reviewSystemDescription")}
          primaryHref="#"
          primaryLabel={t("common.viewRecommendedSystem")}
          secondaryHref={interviewHref}
          secondaryLabel={t("common.continueEvaluatingAlt")}
        />
      </div>
    ),

    company: (
      <div className="space-y-8">
        <NextStepCta
          title={t("workspaceView.company.title")}
          description={t("workspaceView.company.description1")}
          primaryHref={interviewHref}
          primaryLabel={t("common.continueEvaluation")}
          secondaryLabel={t("common.viewBusinessKnowledge")}
          onSecondaryClick={() => setTab("knowledge")}
        />
        <SectionShell
          tone="blueprint"
          icon={Network}
          kicker={t("workspaceView.company.kicker")}
          title={t("workspaceView.company.mapTitle")}
          description={t("workspaceView.company.mapDescription")}
        >
          <CompanyModelPanel
            model={workspace.companyModel}
            departmentNames={effectiveBrand.departmentTerminology}
          />
        </SectionShell>
        <NextStepCta
          title={t("workspaceView.company.title")}
          description={t("workspaceView.company.description2")}
          primaryHref={interviewHref}
          primaryLabel={t("common.continueEvaluation")}
          secondaryLabel={t("common.viewBusinessKnowledge")}
          onSecondaryClick={() => setTab("knowledge")}
        />
      </div>
    ),

    knowledge: (
      <div className="space-y-8">
        <SectionShell
          tone="health"
          icon={FileText}
          kicker={t("common.businessKnowledgeKicker")}
          title={t("workspaceView.knowledge.title")}
          description={t("workspaceView.knowledge.description")}
        >
          <BusinessKnowledge
            workspace={workspace}
            onUpdated={(next) => setWorkspace(next)}
          />
        </SectionShell>
        <NextStepCta
          description={t("workspaceView.knowledge.ctaDescription")}
          primaryHref={interviewHref}
          primaryLabel={t("common.continueEvaluation")}
        />
      </div>
    ),

    insights: (
      <div className="space-y-8">
        <SectionShell
          tone="executive"
          icon={Sparkles}
          kicker={t("workspaceView.insights.kicker")}
          title={t("workspaceView.insights.title")}
          description={t("workspaceView.insights.description")}
        >
          <ExecutiveInsightsPanel insights={executiveInsights} />
        </SectionShell>
        <NextStepCta
          description={t("workspaceView.insights.ctaDescription")}
          primaryHref={interviewHref}
          primaryLabel={t("common.continueEvaluation")}
        />
      </div>
    ),

    architecture: (
      <div className="space-y-8">
        <SectionShell
          tone="blueprint"
          icon={Layers3}
          kicker={t("common.recommendedSystemKicker")}
          title={t("common.solutionTitle")}
          description={t("common.solutionDescription")}
        >
          <SolutionArchitecturePanel
            architecture={workspace.solutionArchitecture}
          />
        </SectionShell>
        <NextStepCta
          description={t("workspaceView.architecture.ctaDescription")}
          primaryHref="#"
          primaryLabel={t("common.viewImplementationPlan")}
          secondaryHref={interviewHref}
          secondaryLabel={t("common.continueEvaluation")}
        />
      </div>
    ),

    processes: (
      <div className="space-y-8">
        <SectionShell
          tone="processes"
          icon={GitBranch}
          kicker={t("workspaceView.processes.kicker")}
          title={t("workspaceView.processes.title")}
          description={t("workspaceView.processes.description")}
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
          description={t("workspaceView.processes.ctaDescription")}
          primaryHref={interviewHref}
          primaryLabel={t("common.continueEvaluation")}
        />
      </div>
    ),

    recommendations: (
      <div className="space-y-8">
        <NextStepCta
          title={t("workspaceView.recommendations.title")}
          description={t("workspaceView.recommendations.description1")}
          primaryLabel={t("common.viewImplementationPlan")}
          onPrimaryClick={() => setTab("roadmap")}
          secondaryHref={interviewHref}
          secondaryLabel={t("common.continueEvaluation")}
        />
        <SectionShell
          tone="executive"
          icon={Lightbulb}
          kicker={t("workspaceView.recommendations.kicker")}
          title={t("workspaceView.recommendations.subtitle")}
          description={t("workspaceView.recommendations.subdescription")}
        >
          {explainedModules.length === 0 ? (
            <EmptyHint
              text={t("workspaceView.recommendations.noModules")}
              href={interviewHref}
            />
          ) : (
            <ModuleInsightCards recommendations={explainedModules.slice(0, 5)} />
          )}
        </SectionShell>
        <SectionShell tone="health" title={t("workspaceView.recommendations.moreTitle")}>
          {explainedRecommendations.length === 0 ? (
            <EmptyHint
              text={t("workspaceView.recommendations.noDetailed")}
              href={interviewHref}
            />
          ) : (
            <ReasoningCards
              recommendations={explainedRecommendations.slice(0, 5)}
            />
          )}
        </SectionShell>
        <NextStepCta
          title={t("workspaceView.recommendations.title")}
          description={t("workspaceView.recommendations.description2")}
          primaryLabel={t("common.viewImplementationPlan")}
          onPrimaryClick={() => setTab("roadmap")}
          secondaryHref={interviewHref}
          secondaryLabel={t("common.continueEvaluation")}
        />
      </div>
    ),

    simulator: (
      <div className="space-y-8">
        <SectionShell
          tone="executive"
          icon={Sparkles}
          kicker={t("workspaceView.simulator.kicker")}
          title={t("workspaceTabs.simulator")}
          description={t("workspaceView.simulator.description")}
        >
          <ExecutiveSimulatorPanel workspace={workspace} />
        </SectionShell>
        <NextStepCta
          description={t("workspaceView.simulator.ctaDescription")}
          primaryHref={interviewHref}
          primaryLabel={t("common.continueEvaluation")}
        />
      </div>
    ),

    roadmap: (
      <div className="space-y-8">
        <NextStepCta
          title={t("workspaceView.roadmap.title")}
          description={t("workspaceView.roadmap.description1")}
          primaryLabel={t("common.viewDocuments")}
          onPrimaryClick={() => setTab("deliverables")}
          secondaryHref={interviewHref}
          secondaryLabel={t("common.continueEvaluation")}
        />
        <SectionShell
          tone="processes"
          icon={Route}
          kicker={t("workspaceTabs.roadmap")}
          title={t("workspaceView.roadmap.orderTitle")}
          description={t("workspaceView.roadmap.orderDescription")}
        >
          <RoadmapTimeline items={roadmapItems} />
        </SectionShell>
        <NextStepCta
          title={t("workspaceView.roadmap.title")}
          description={t("workspaceView.roadmap.description2")}
          primaryLabel={t("common.viewDocuments")}
          onPrimaryClick={() => setTab("deliverables")}
          secondaryHref={interviewHref}
          secondaryLabel={t("common.continueEvaluation")}
        />
      </div>
    ),

    deliverables: (
      <div className="space-y-8">
        <SectionShell
          tone="deliverables"
          icon={FileText}
          kicker={t("workspaceTabs.deliverables")}
          title={t("workspaceView.deliverables.title")}
          description={t("workspaceView.deliverables.description")}
        >
          <DeliverablesPanel
            workspace={workspace}
            onUpdated={(next) => setWorkspace(next)}
          />
        </SectionShell>
        <NextStepCta
          description={t("workspaceView.deliverables.ctaDescription")}
          primaryHref={interviewHref}
          primaryLabel={t("common.continueEvaluation")}
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
          kicker={t("common.blueprintKicker")}
          title={t("workspaceView.blueprint.title")}
          description={t("workspaceView.blueprint.description")}
        >
          <AnimatedBlueprint model={executive.blueprint} />
        </SectionShell>
        <SectionShell tone="blueprint">
          <BusinessBlueprintPanel blueprints={workspace.blueprints ?? []} />
        </SectionShell>
        <SectionShell tone="health" title={t("common.whatNow")}>
          <p className="mb-4 text-sm text-[var(--isalwa-slate)]">
            {isConsultant
              ? t("workspaceView.blueprint.reviewSystemDescription")
              : t("workspaceView.blueprint.reviewImplementationDescription")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() =>
                setTab(isConsultant ? "architecture" : "roadmap")
              }
            >
              {isConsultant
                ? t("common.viewRecommendedSystem")
                : t("common.viewImplementationPlan")}
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href={interviewHref}>{t("common.continueEvaluatingAlt")}</Link>
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
          kicker={t("common.recommendedSystemKicker")}
          title={t("common.solutionTitle")}
          description={t("common.solutionDescription")}
        >
          <SolutionArchitecturePanel
            architecture={workspace.solutionArchitecture}
          />
        </SectionShell>
        <SectionShell tone="health" title={t("common.whatNow")}>
          <p className="mb-4 text-sm text-[var(--isalwa-slate)]">
            {t("workspaceView.architecture.ctaDescription")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={() => setTab("roadmap")}>
              {t("common.viewImplementationPlan")}
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href={interviewHref}>{t("common.continueEvaluation")}</Link>
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
        nextGoal={nextStepVoice.message}
      />
      {session?.role === "consultant" ? (
        <BackLink href="/" label={t("workspaceView.backToCompanies")} className="mb-6" />
      ) : null}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--isalwa-slate)]/80">
            {t("workspaceView.header.kicker")}
          </p>
          <div className="mt-4 flex items-center gap-3">
            {effectiveBrand.logoUrl.value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={effectiveBrand.logoUrl.value}
                alt={t("workspaceView.header.logoAlt", { company: effectiveBrand.companyDisplayName })}
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
          labelOverrideKeys={tabLabelOverrideKeys}
        />
      </motion.div>

      {/* Mission 19 — 56px was off the law's 8px rhythm; 64px (`--isalwa-space-16`) is the nearest step. */}
      <Separator className="my-16" />

      <div className="flex flex-wrap items-center gap-3 pb-16">
        {session?.role === "consultant" ? (
          <BackLink href="/" label={t("workspaceView.backToCompanies")} />
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
  const { t } = useTranslations();
  return (
    <div className="rounded-2xl border border-dashed border-[var(--isalwa-mist)] bg-white/70 px-5 py-6">
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{text}</p>
      <div className="mt-4">
        <Button asChild variant="secondary">
          <Link href={href}>{t("common.continueEvaluation")}</Link>
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
  const { t } = useTranslations();
  if (decisions.length === 0) {
    return (
      <p className="text-sm text-[var(--isalwa-slate)]/60">
        {t("workspaceView.cockpit.noDecisions")}
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
