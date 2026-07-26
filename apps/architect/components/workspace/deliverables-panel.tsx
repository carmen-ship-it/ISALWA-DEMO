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
  { id: "executive", label: "Executive Summary" },
  { id: "assessment", label: "Business Assessment" },
  { id: "blueprint", label: "Blueprint" },
  { id: "solution", label: "Architecture" },
  { id: "processes", label: "Processes" },
  { id: "prd", label: "Requirements" },
  { id: "roadmap", label: "Roadmap" },
  { id: "cursor", label: "Build Brief" },
  { id: "implementation", label: "Implementation Plan" },
  { id: "backlog", label: "Work Backlog" },
  { id: "proposal", label: "Proposal" },
  { id: "exports", label: "Export Options" },
];

export function DeliverablesPanel({
  workspace,
  onUpdated,
}: {
  workspace: CompanyWorkspace;
  onUpdated: (next: CompanyWorkspace) => void;
}) {
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
          lastActivityLabel: "Deliverables generated",
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
            Deliverables
          </p>
          <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
            Consulting package
          </h3>
          <p className="mt-3 text-neutral-600">
            Generate a complete consulting package from discovery evidence,
            blueprint, architecture, and processes — documentation for decisions,
            not production software.
          </p>
          <div className="mt-6">
            <Button onClick={() => void generate()} disabled={busy}>
              {busy ? "Generating…" : "Generate package"}
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
              Deliverables
            </p>
            <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
              {pack.companyName}
            </h3>
            <p className="mt-3 max-w-2xl text-neutral-600">{pack.summary}</p>
            <p className="mt-4 text-sm text-neutral-400">
              {recommendationStrength(pack.overallConfidence)} ·{" "}
              {formatRelativeActivity(pack.generatedAt)} · read-only previews
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => void generate()}
            disabled={busy}
          >
            {busy ? "Generating…" : "Regenerate"}
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
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
        <Article title="Executive Summary">
          <Section title="Vision" body={d.vision} />
          <Section title="Current State" body={d.currentState} />
          <List title="Problems" items={d.problems} />
          <List title="Biggest Risks" items={d.biggestRisks} />
          <List title="Immediate Opportunities" items={d.immediateOpportunities} />
          <List title="Strategic Opportunities" items={d.strategicOpportunities} />
          <List title="Recommended Roadmap" items={d.recommendedRoadmap} />
          <List title="Investment Areas" items={d.investmentAreas} />
          <Section title="Executive Recommendation" body={d.executiveRecommendation} />
        </Article>
      );
    }
    case "assessment": {
      const d = pack.businessAssessment;
      return (
        <Article title="Business Assessment">
          <List title="Current Processes" items={d.currentProcesses} />
          <List title="Departments" items={d.departments} />
          <Meta
            label="Operating maturity"
            value={maturityLabel(d.overallMaturity)}
          />
          <Meta
            label="Business health"
            value={healthLabel(d.overallHealth)}
          />
          <List title="Pain Points" items={d.painPoints} />
          <List
            title="Risks"
            items={d.risks.map((r) => `${r.title} · ${r.severity}`)}
          />
          <List title="Automation Opportunities" items={d.automationOpportunities} />
        </Article>
      );
    }
    case "blueprint": {
      const d = pack.businessBlueprint;
      if (!d) return <Empty label="Blueprint deliverable unavailable" />;
      return (
        <Article title="Business Blueprint">
          <Section title="Summary" body={d.summary} />
          <List title="Capabilities" items={d.capabilities} />
          <List title="Departments" items={d.departments} />
          <List title="Workflows" items={d.workflows} />
          <List title="Core information" items={d.entities} />
          <List title="Systems" items={d.systems} />
          <List title="Operating rules" items={d.operatingRules} />
          <List title="Recommended capabilities" items={d.modules} />
        </Article>
      );
    }
    case "solution": {
      const d = pack.solutionArchitecture;
      if (!d) return <Empty label="Solution deliverable unavailable" />;
      return (
        <Article title="Recommended Architecture">
          <Section title="Summary" body={d.summary} />
          <List title="Capabilities" items={d.modules} />
          <List title="Core information" items={d.entities} />
          <List title="Relationships" items={d.relationships} />
          <List title="Roles" items={d.roles} />
          <List title="Access principles" items={d.permissions} />
          <List title="Navigation" items={d.navigation} />
          <List title="Integrations" items={d.integrations} />
          <List title="Roadmap" items={d.roadmap} />
        </Article>
      );
    }
    case "processes": {
      const d = pack.processBook;
      if (!d) return <Empty label="Process book unavailable" />;
      return (
        <Article title="Process Book">
          <Section title="Summary" body={d.summary} />
          <p className="mt-2 text-xs text-neutral-400">
            For interactive diagrams, open the Processes tab in this workspace.
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
              <List title="Approvals" items={wf.approvals} />
              <List title="Actors" items={wf.actors} />
              <List title="Automation" items={wf.automationOpportunities} />
            </div>
          ))}
        </Article>
      );
    }
    case "prd": {
      const d = pack.prd;
      return (
        <Article title="Product Requirements">
          <List title="Goals" items={d.goals} />
          <List title="Users" items={d.users} />
          <List title="Functional Requirements" items={d.functionalRequirements} />
          <List
            title="Non-functional Requirements"
            items={d.nonFunctionalRequirements}
          />
          <List title="Acceptance Criteria" items={d.acceptanceCriteria} />
          <List title="Dependencies" items={d.dependencies} />
          <List title="Future Scope" items={d.futureScope} />
          <List title="Out of Scope" items={d.outOfScope} />
          <List title="Risks" items={d.risks} />
          <div className="mt-6 border-t border-neutral-100 pt-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
              System design concepts
            </p>
            <List
              title="System capabilities"
              items={pack.technicalArchitecture.systemModules}
            />
            <List
              title="Information concepts"
              items={pack.technicalArchitecture.databaseConcepts}
            />
            <List
              title="Connectivity concepts"
              items={pack.technicalArchitecture.apiConcepts}
            />
            <List
              title="Integrations"
              items={pack.technicalArchitecture.integrations}
            />
          </div>
        </Article>
      );
    }
    case "roadmap": {
      const d = pack.developmentRoadmap;
      return (
        <Article title="Development Roadmap">
          {d.phases.map((p) => (
            <div key={p.phase} className="mt-5 first:mt-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
                Phase {p.phase} · {p.complexity}
              </p>
              <p className="mt-1 text-lg text-neutral-950">{p.name}</p>
              <p className="mt-1 text-sm text-neutral-500">{p.businessValue}</p>
              <List title="Goals" items={p.goals} />
              <List title="Modules" items={p.modules} />
            </div>
          ))}
          <List title="Future" items={d.future} />
        </Article>
      );
    }
    case "cursor": {
      const d = pack.cursorContext;
      return (
        <Article title="Build Brief">
          <Section title="Purpose" body={d.purpose} />
          <List title="Core capabilities" items={d.coreModules} />
          <List title="Business rules" items={d.businessRules} />
          <List title="Critical workflows" items={d.criticalWorkflows} />
          <List title="Important constraints" items={d.importantConstraints} />
          <List title="Domain language" items={d.domainLanguage} />
          <List title="Success measures" items={d.successMetrics} />
          <List title="Out of bounds" items={d.doNot} />
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-stone-50/80 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
              Master narrative
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
        <Article title="Implementation Plan">
          {d.phases.map((p) => (
            <div key={p.name} className="mt-5 first:mt-0">
              <p className="text-lg text-neutral-950">{p.name}</p>
              <List title="Objectives" items={p.objectives} />
              <List title="Workstreams" items={p.workstreams} />
              <List title="Exit Criteria" items={p.exitCriteria} />
            </div>
          ))}
          <List title="Risks" items={d.risks} />
        </Article>
      );
    }
    case "backlog": {
      const d = pack.sprintBacklog;
      return (
        <Article title="Sprint Backlog">
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
          <Section title="Engagement" body={d.engagementSummary} />
          <Section title="Recommended Approach" body={d.recommendedApproach} />
          <List title="Scope" items={d.scope} />
          <List title="Timeline" items={d.timelineOutline} />
          <Section title="Investment" body={d.investmentNarrative} />
          <List title="Next Steps" items={d.nextSteps} />
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
    <Article title="Export options">
      <p className="text-sm text-neutral-500">
        Planned export formats for client handoff — available in a later
        release.
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
