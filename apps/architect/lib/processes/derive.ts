import { createId } from "@/lib/utils";
import type {
  BusinessBlueprint,
  BusinessProcessModel,
  CompanyWorkspace,
  ProcessEvidenceRef,
} from "@/types";
import { attachActorIds, deriveActors } from "./actors";
import { deriveApprovals } from "./approvals";
import { deriveAutomationCandidates } from "./automation";
import { deriveBottlenecks } from "./bottlenecks";
import { deriveDependencies } from "./dependencies";
import { deriveDocuments } from "./documents";
import { deriveExceptions } from "./exceptions";
import { deriveHandoffs } from "./handoffs";
import { deriveWorkflows } from "./workflows";

/**
 * Derive Business Process Model from Blueprint + workspace evidence.
 * Deterministic. Never invents workflows. No LLM / diagrams.
 */
export function deriveBusinessProcesses(input: {
  workspace: CompanyWorkspace;
  blueprint: BusinessBlueprint;
}): BusinessProcessModel {
  const { workspace, blueprint } = input;
  const stamp = new Date().toISOString();
  const consulting = workspace.conversationMemory?.consulting ?? null;
  const solution = workspace.solutionArchitecture;

  const evidence: ProcessEvidenceRef[] = [
    {
      source: "blueprint",
      id: blueprint.id,
      label: `Blueprint v${blueprint.version}`,
    },
    ...(solution
      ? [
          {
            source: "solution" as const,
            id: solution.id,
            label: `Solution Architecture v${solution.blueprintVersion}`,
          },
        ]
      : []),
    ...(consulting
      ? [
          {
            source: "consulting" as const,
            id: "consulting",
            label: "Consulting intelligence",
          },
        ]
      : []),
    ...workspace.meetings.slice(0, 2).map((m) => ({
      source: "meeting" as const,
      id: m.id,
      label: m.title,
    })),
    ...(workspace.knowledge?.assets.slice(0, 2).map((a) => ({
      source: "knowledge" as const,
      id: a.id,
      label: a.title,
    })) ?? []),
    {
      source: "memory",
      id: workspace.id,
      label: `${workspace.companyName} company memory`,
    },
  ];

  const solutionWorkflowByName = new Map<string, string>();
  for (const ref of solution?.workflows ?? []) {
    solutionWorkflowByName.set(ref.name.toLowerCase(), ref.id);
  }

  const consultingRiskIds = (consulting?.risks ?? []).map((r) => r.id);
  const knowledgeAssetIds = (workspace.knowledge?.assets ?? []).map((a) => a.id);

  const { workflows: rawWorkflows } = deriveWorkflows({
    blueprintWorkflows: blueprint.workflows,
    evidence,
    solutionWorkflowByName,
    knowledgeAssetIds,
    consultingRiskIds,
  });

  const actors = deriveActors(rawWorkflows, evidence);
  let workflows = attachActorIds(rawWorkflows, actors);

  const handoffs = deriveHandoffs(workflows, evidence);
  const approvals = deriveApprovals({
    workflows,
    solutionApprovalRules: solution?.approvalRules ?? [],
    evidence,
  });
  const documents = deriveDocuments(workflows, evidence);

  const blueprintById = new Map(blueprint.workflows.map((w) => [w.id, w]));
  const exceptions = deriveExceptions(workflows, blueprintById, evidence);
  const bottlenecks = deriveBottlenecks({
    workflows,
    consultingRisks: consulting?.risks ?? [],
    evidence,
  });
  const automationCandidates = deriveAutomationCandidates(workflows, evidence);
  const dependencies = deriveDependencies(workflows, evidence);

  workflows = workflows.map((wf) => ({
    ...wf,
    handoffIds: handoffs.filter((h) => h.workflowId === wf.id).map((h) => h.id),
    approvalIds: approvals.filter((a) => a.workflowId === wf.id).map((a) => a.id),
    documentIds: documents.filter((d) => d.workflowId === wf.id).map((d) => d.id),
    exceptionIds: exceptions.filter((e) => e.workflowId === wf.id).map((e) => e.id),
    bottleneckIds: bottlenecks
      .filter((b) => b.workflowId === wf.id)
      .map((b) => b.id),
    automationCandidateIds: automationCandidates
      .filter((c) => c.workflowId === wf.id)
      .map((c) => c.id),
  }));

  const overallConfidence =
    workflows.length === 0
      ? 0
      : Math.round(
          (workflows.reduce((sum, w) => sum + w.confidence, 0) /
            workflows.length) *
            100,
        ) / 100;

  return {
    id: createId("process"),
    workspaceId: workspace.id,
    blueprintId: blueprint.id,
    blueprintVersion: blueprint.version,
    generatedAt: stamp,
    summary: `Business processes for ${workspace.companyName} from Blueprint v${blueprint.version} — ${workflows.length} workflows, ${handoffs.length} handoffs, ${bottlenecks.length} bottlenecks.`,
    workflows,
    actors,
    handoffs,
    approvals,
    documents,
    exceptions,
    bottlenecks,
    automationCandidates,
    dependencies,
    solutionArchitectureId: solution?.id ?? null,
    evidence,
    overallConfidence,
  };
}
