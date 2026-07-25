import type {
  BusinessBlueprint,
  BusinessProcessModel,
  ConsultingIntelligence,
  ProcessRiskLevel,
  SolutionArchitecture,
  WorkspaceKnowledge,
} from "@/types";
import {
  buildDependencyPanel,
  buildProcessGraph,
  departmentFromActor,
  deriveStudioMetrics,
} from "./graph";
import { layoutProcessGraph } from "./layout";
import type {
  ProcessOverlayKind,
  ProcessViewKind,
  ProcessVisualizationModel,
  VizDependencyPanel,
} from "./types";

export interface ProcessVisualizationContext {
  processes: BusinessProcessModel;
  blueprint: BusinessBlueprint | null;
  solution: SolutionArchitecture | null;
  knowledge: WorkspaceKnowledge | null;
  consulting: ConsultingIntelligence | null;
}

/**
 * Derive a read-only visualization model from the Process Engine.
 * Consumes Blueprint / Solution / Knowledge / Consulting by ID only.
 */
export function deriveProcessVisualization(input: {
  context: ProcessVisualizationContext;
  workflowId: string;
  view: ProcessViewKind;
  overlay: ProcessOverlayKind;
  departmentFilter: string | null;
  collapsedGroups: Set<string>;
}): ProcessVisualizationModel | null {
  const { context, workflowId, view, overlay, departmentFilter, collapsedGroups } =
    input;
  const workflow = context.processes.workflows.find((w) => w.id === workflowId);
  if (!workflow) return null;

  const approvals = context.processes.approvals.filter(
    (a) => a.workflowId === workflow.id,
  );
  const approvalStepIds = new Set(
    approvals.map((a) => a.stepId).filter((id): id is string => id != null),
  );

  const bottleneckByStepId = new Map<string, ProcessRiskLevel>();
  for (const b of context.processes.bottlenecks) {
    if (b.workflowId !== workflow.id || !b.stepId) continue;
    // Prefer consulting-linked severity when present
    const existing = bottleneckByStepId.get(b.stepId);
    const order = ["low", "moderate", "high", "critical"] as const;
    if (
      !existing ||
      order.indexOf(b.severity) > order.indexOf(existing)
    ) {
      bottleneckByStepId.set(b.stepId, b.severity);
    }
  }

  // Enrich pain from consulting risks referenced on the workflow (by ID)
  if (context.consulting) {
    const riskById = new Map(
      context.consulting.risks.map((r) => [r.id, r] as const),
    );
    for (const riskId of workflow.consultingRiskIds) {
      const risk = riskById.get(riskId);
      if (!risk) continue;
      // Attach to first bottleneck step lacking severity upgrade
      for (const step of workflow.steps) {
        if (bottleneckByStepId.has(step.id)) continue;
        if (step.riskLevel === "low" || step.riskLevel === "moderate") {
          bottleneckByStepId.set(step.id, risk.severity);
          break;
        }
      }
    }
  }

  const handoffs = context.processes.handoffs.filter(
    (h) => h.workflowId === workflow.id,
  );

  const { nodes: baseNodes, edges } = buildProcessGraph({
    workflow,
    handoffPairs: handoffs.map((h) => ({
      id: h.id,
      fromStepId: h.fromStepId,
      toStepId: h.toStepId,
    })),
    approvalStepIds,
    bottleneckByStepId,
  });

  const laid = layoutProcessGraph({
    view,
    departmentFilter,
    baseNodes,
    edges,
    collapsedGroups,
  });

  const documents = context.processes.documents.filter(
    (d) => d.workflowId === workflow.id,
  );
  const automation = context.processes.automationCandidates.filter(
    (c) => c.workflowId === workflow.id,
  );

  const metrics = deriveStudioMetrics({
    workflow,
    approvalCount: approvals.length,
    documentCount: documents.length,
    automationOpportunityCount: automation.filter(
      (c) => c.aiOpportunity != null || c.quickAutomation != null,
    ).length,
  });

  // Cross-check solution workflow ref exists (ID only — no duplicated model)
  const _solutionAligned =
    workflow.solutionWorkflowId != null &&
    (context.solution?.workflows.some(
      (w) => w.id === workflow.solutionWorkflowId,
    ) ??
      false);
  void _solutionAligned;
  void context.blueprint;

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    view,
    overlay,
    nodes: laid.nodes,
    edges: laid.edges,
    lanes: laid.lanes,
    bounds: laid.bounds,
    metrics,
    approvalStepIds: [...approvalStepIds],
    bottleneckStepIds: [...bottleneckByStepId.keys()],
  };
}

export function deriveStepDependencies(input: {
  context: ProcessVisualizationContext;
  workflowId: string;
  stepId: string;
}): VizDependencyPanel | null {
  const workflow = input.context.processes.workflows.find(
    (w) => w.id === input.workflowId,
  );
  const step = workflow?.steps.find((s) => s.id === input.stepId);
  if (!step || !workflow) return null;

  const documents = input.context.processes.documents
    .filter((d) => d.stepId === step.id || (d.workflowId === workflow.id && !d.stepId))
    .map((d) => d.name);

  const approvals = input.context.processes.approvals
    .filter((a) => a.stepId === step.id || a.workflowId === workflow.id)
    .map((a) => a.name);

  const policies =
    input.context.blueprint?.operatingRules
      .filter((r) =>
        /approv|credit|policy|threshold/i.test(r.statement),
      )
      .slice(0, 4)
      .map((r) => r.statement) ?? [];

  // Knowledge entities referenced by ID on the workflow
  const knowledgeHints =
    input.context.knowledge?.entities
      .filter((e) =>
        workflow.knowledgeAssetIds.some((id) => id === e.id) ||
        step.inputs.some((i) =>
          e.name.toLowerCase().includes(i.toLowerCase().slice(0, 6)),
        ),
      )
      .slice(0, 5)
      .map((e) => e.name) ?? [];

  return buildDependencyPanel(step, {
    documents: [...new Set([...documents, ...step.documentsUsed, ...knowledgeHints])],
    approvals: [...new Set(approvals)],
    policies,
  });
}

export function listDepartmentsForWorkflow(
  processes: BusinessProcessModel,
  workflowId: string,
): string[] {
  const workflow = processes.workflows.find((w) => w.id === workflowId);
  if (!workflow) return [];
  const set = new Set<string>();
  for (const step of workflow.steps) {
    const d = departmentFromActor(step.actor);
    if (d) set.add(d);
  }
  if (workflow.department) set.add(workflow.department);
  return [...set];
}
