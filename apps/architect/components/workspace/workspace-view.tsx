"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArchitectNav } from "@/components/nav/architect-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BusinessBlueprintPanel } from "@/components/workspace/business-blueprint-panel";
import { SolutionArchitecturePanel } from "@/components/workspace/solution-architecture-panel";
import { BusinessProcessesPanel } from "@/components/workspace/business-processes-panel";
import { DeliverablesPanel } from "@/components/workspace/deliverables-panel";
import { AnimatedBlueprint } from "@/components/workspace/executive/animated-blueprint";
import { ConfidenceMeter } from "@/components/workspace/executive/confidence-meter";
import { DiscoveryJourney } from "@/components/workspace/executive/discovery-journey";
import { ExecutiveDashboard } from "@/components/workspace/executive/executive-dashboard";
import { ModuleInsightCards } from "@/components/workspace/executive/module-insight-cards";
import { ReasoningCards } from "@/components/workspace/executive/reasoning-cards";
import {
  KnowledgeCenter,
  KnowledgeSectionShell,
} from "@/components/workspace/knowledge-center";
import { deriveExecutiveExperience } from "@/lib/executive";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { buildResumeBriefing } from "@/lib/resume";
import { formatTimelineDate, sortTimelineNewestFirst } from "@/lib/timeline";
import { formatRelativeActivity } from "@/lib/workspace";
import type { CompanyWorkspace } from "@/types";

export function WorkspaceView({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const store = useMemo(() => getClientCompanyMemoryStore(), []);
  const [workspace, setWorkspace] = useState<CompanyWorkspace | null>(null);

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

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10 sm:px-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
            Company Workspace
          </p>
          <h1 className="architect-serif mt-4 text-4xl leading-tight text-neutral-950 sm:text-5xl">
            {workspace.companyName}
          </h1>
          <p className="mt-3 max-w-xl text-neutral-500">
            {workspace.industry === "unknown"
              ? "Industry not yet classified"
              : workspace.industry}{" "}
            · {workspace.currentStage} Phase ·{" "}
            {formatRelativeActivity(workspace.lastActivityAt)}
          </p>
        </div>
        <ArchitectNav
          workspaceHref={`/workspace/${workspace.id}`}
          interviewHref={interviewHref}
        />
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mt-10"
      >
        <Card className="px-6 py-6">
          <ConfidenceMeter value={workspace.businessUnderstanding} />
        </Card>
      </motion.div>

      <div className="mt-8">
        <Button asChild size="lg">
          <Link href={interviewHref}>{briefing.ctaLabel}</Link>
        </Button>
        {briefing.estimatedMinutesRemaining ? (
          <p className="mt-3 text-sm text-neutral-500">
            About {briefing.estimatedMinutesRemaining} minutes remaining.
          </p>
        ) : null}
      </div>

      <div className="mt-14 space-y-16">
        <Section title="Discovery Journey">
          <Card className="px-6 py-6">
            <DiscoveryJourney
              dayLabel={executive.dayLabel}
              stages={executive.journey}
            />
          </Card>
        </Section>

        <Section title="Executive Dashboard">
          <ExecutiveDashboard model={executive.dashboard} />
        </Section>

        <Section title="Living Blueprint">
          <AnimatedBlueprint model={executive.blueprint} />
        </Section>

        <Section title="Modules">
          <ModuleInsightCards modules={executive.modules} />
        </Section>

        <Section title="Reasoning">
          <ReasoningCards cards={executive.reasoning} />
        </Section>

        <Section title="Open Questions">
          {workspace.openQuestions.length === 0 ? (
            <p className="text-neutral-500">No open questions right now.</p>
          ) : (
            <p className="text-neutral-800">
              {workspace.openQuestions.join(" · ")}
            </p>
          )}
        </Section>

        <Section title="Suggested Next Meeting">
          <p className="text-neutral-800">
            {workspace.suggestedNextMeeting ?? "Continue discovery"}
          </p>
        </Section>

        <Section title="Activity Timeline">
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
        </Section>

        <Section title="Business Blueprint">
          <BusinessBlueprintPanel blueprints={workspace.blueprints ?? []} />
        </Section>

        <Section title="Solution Architecture">
          <SolutionArchitecturePanel
            architecture={workspace.solutionArchitecture}
          />
        </Section>

        <Section title="Process Studio">
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
        </Section>

        <Section title="Deliverables">
          <DeliverablesPanel
            workspace={workspace}
            onUpdated={(next) => setWorkspace(next)}
          />
        </Section>

        <KnowledgeSectionShell title="Knowledge">
          <KnowledgeCenter knowledge={workspace.knowledge} />
        </KnowledgeSectionShell>

        {workspace.currentReport ? (
          <Section title="Living Report">
            <p className="text-neutral-700">
              {workspace.currentReport.executiveSummary}
            </p>
            <div className="mt-4">
              <Button asChild variant="secondary">
                <Link href={`/report?workspaceId=${workspace.id}`}>
                  View living report
                </Link>
              </Button>
            </div>
          </Section>
        ) : null}
      </div>

      <Separator className="my-14" />

      <div className="flex flex-wrap gap-3 pb-16">
        <Button asChild variant="secondary">
          <Link href="/">All companies</Link>
        </Button>
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

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
        {title}
      </h2>
      <div className="mt-4 text-base leading-relaxed">{children}</div>
    </section>
  );
}
