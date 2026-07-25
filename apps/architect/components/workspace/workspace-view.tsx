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
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { buildResumeBriefing } from "@/lib/resume";
import { formatTimelineDate, sortTimelineNewestFirst } from "@/lib/timeline";
import { formatRelativeActivity } from "@/lib/workspace";
import type { CompanyWorkspace } from "@/types";

export function WorkspaceView({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const store = useMemo(() => getClientCompanyMemoryStore(), []);
  const [workspace, setWorkspace] = useState<CompanyWorkspace | null>(null);
  const [tab, setTab] = useState<WorkspaceTabId>("executive");

  useEffect(() => {
    void store.workspaces.get(workspaceId).then(setWorkspace);
  }, [store, workspaceId]);

  const executive = useMemo(
    () => (workspace ? deriveExecutiveExperience(workspace) : null),
    [workspace],
  );

  if (!workspace || !executive) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
        <p className="text-neutral-500">Loading workspace…</p>
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
          kicker="Executive summary"
          title="Where we stand"
          description="A decision-ready view of understanding, risk, priorities, and next moves."
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
                About {briefing.estimatedMinutesRemaining} minutes remaining in
                discovery.
              </p>
            ) : null}
          </div>
        </SectionShell>

        <SectionShell tone="executive">
          <ExecutiveDashboard model={executive.dashboard} />
        </SectionShell>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionShell
            tone="risks"
            kicker="Open questions"
            className="sm:px-6 sm:py-6"
          >
            {workspace.openQuestions.length === 0 ? (
              <p className="text-sm text-neutral-600">
                No open questions right now.
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
            kicker="Suggested next meeting"
            className="sm:px-6 sm:py-6"
          >
            <p className="text-base leading-relaxed text-neutral-800">
              {workspace.suggestedNextMeeting ?? "Continue discovery"}
            </p>
          </SectionShell>
        </div>

        {workspace.currentReport ? (
          <SectionShell
            tone="deliverables"
            kicker="Living report"
            title="Client narrative"
            description={workspace.currentReport.executiveSummary}
          >
            <Button asChild variant="secondary">
              <Link href={`/report?workspaceId=${workspace.id}`}>
                Open living report
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
          kicker="Assessment"
          title="Discovery progress"
          description="How far engagement has come — and what evidence supports the picture."
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
          kicker="Brand & experience"
          title="How the company should feel"
          description="Read-only guidance inferred from discovery — identity, tone, and experience expectations."
        >
          <BrandExperiencePanel model={workspace.brandExperience} />
        </SectionShell>

        <SectionShell
          tone="health"
          kicker="Knowledge"
          title="Evidence base"
          description="What company knowledge has been absorbed into the assessment."
        >
          <KnowledgeCenter knowledge={workspace.knowledge} />
        </SectionShell>

        <SectionShell tone="deliverables" kicker="Activity" title="Recent progress">
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
          kicker="Blueprint"
          title="Operating model"
          description="How the business works today — and the future state we are designing toward."
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
        kicker="Architecture"
        title="Recommended operating system"
        description="The software capabilities the business needs — designed, not built."
      >
        <SolutionArchitecturePanel
          architecture={workspace.solutionArchitecture}
        />
      </SectionShell>
    ),

    processes: (
      <SectionShell
        tone="processes"
        kicker="Processes"
        title="How work moves"
        description="Critical workflows, handoffs, and opportunities to remove friction."
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
          kicker="Recommendations"
          title="What we recommend"
          description="Capabilities and rationale grounded in discovery evidence — not generic software lists."
        >
          <ModuleInsightCards modules={executive.modules} />
        </SectionShell>
        <SectionShell tone="health">
          <ReasoningCards cards={executive.reasoning} />
        </SectionShell>
        {workspace.currentReport ? (
          <SectionShell tone="deliverables" kicker="Narrative">
            <p className="text-sm text-neutral-700">
              For the full client narrative, open the living report.
            </p>
            <div className="mt-4">
              <Button asChild variant="secondary">
                <Link href={`/report?workspaceId=${workspace.id}`}>
                  Open living report
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
        kicker="Roadmap"
        title="Phased path forward"
        description="A practical sequence from current operations to the recommended future state."
      >
        {roadmapPhases.length === 0 &&
        executive.dashboard.estimatedPhases.length === 0 ? (
          <Card className="border-orange-100/50 bg-white/80 px-5 py-5 shadow-none">
            <p className="text-sm text-neutral-600">
              The delivery roadmap appears once recommended capabilities are
              sequenced from discovery evidence.
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
                        Capabilities: {phase.modules.join(" · ")}
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
        kicker="Deliverables"
        title="Consulting package"
        description="Board-ready documentation generated from company memory — for decisions, not code."
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
            Company workspace
          </p>
          <h1 className="architect-serif mt-4 text-4xl leading-tight text-neutral-950 sm:text-5xl">
            {workspace.companyName}
          </h1>
          <p className="mt-3 max-w-xl text-neutral-500">
            {workspace.industry === "unknown"
              ? "Industry not yet classified"
              : workspace.industry}{" "}
            · {workspace.currentStage} phase ·{" "}
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
