import type { ProcessRiskLevel } from "@/types";
import type {
  AutomationTone,
  PainTone,
  ProcessStudioMetrics,
  VizDependencyPanel,
  VizEdge,
  VizNode,
} from "./types";
import type { ProcessStep, ProcessWorkflow } from "@/types";

export function painFromRisk(level: ProcessRiskLevel): PainTone {
  switch (level) {
    case "critical":
      return "critical";
    case "high":
      return "bottleneck";
    case "moderate":
      return "attention";
    default:
      return "healthy";
  }
}

export function automationTone(
  step: ProcessStep,
  isApproval: boolean,
): AutomationTone {
  if (isApproval) return "human_approval";
  if (step.aiOpportunity) return "ai_opportunity";
  if (step.automated) return "automation";
  return "manual";
}

/**
 * Build graph topology from a single ProcessWorkflow.
 * Nodes = steps (by order). Edges = sequential + handoff refs.
 */
export function buildProcessGraph(input: {
  workflow: ProcessWorkflow;
  handoffPairs: Array<{
    id: string;
    fromStepId: string;
    toStepId: string;
  }>;
  approvalStepIds: Set<string>;
  bottleneckByStepId: Map<string, ProcessRiskLevel>;
}): {
  nodes: Omit<VizNode, "x" | "y" | "width" | "height" | "laneIndex" | "collapsed">[];
  edges: VizEdge[];
} {
  const ordered = [...input.workflow.steps].sort((a, b) => a.order - b.order);
  const nodes = ordered.map((step) => {
    const bottleneckRisk = input.bottleneckByStepId.get(step.id);
    const risk = bottleneckRisk ?? step.riskLevel;
    const isApproval = input.approvalStepIds.has(step.id);
    return {
      id: `vnode_${step.id}`,
      stepId: step.id,
      workflowId: input.workflow.id,
      label: step.name,
      order: step.order,
      actor: step.actor,
      department: null as string | null,
      pain: painFromRisk(risk),
      automation: automationTone(step, isApproval),
      durationLabel: step.estimatedDuration,
      isHandoffTarget: false,
      isApproval,
    };
  });

  const nodeByStep = new Map(nodes.map((n) => [n.stepId, n]));
  const edges: VizEdge[] = [];

  for (let i = 0; i < ordered.length - 1; i++) {
    const from = nodeByStep.get(ordered[i].id);
    const to = nodeByStep.get(ordered[i + 1].id);
    if (!from || !to) continue;
    edges.push({
      id: `vedge_seq_${from.stepId}_${to.stepId}`,
      fromNodeId: from.id,
      toNodeId: to.id,
      handoffId: null,
      kind: "sequence",
    });
  }

  for (const h of input.handoffPairs) {
    const from = nodeByStep.get(h.fromStepId);
    const to = nodeByStep.get(h.toStepId);
    if (!from || !to) continue;
    to.isHandoffTarget = true;
    // Prefer handoff kind on matching sequential edge
    const existing = edges.find(
      (e) => e.fromNodeId === from.id && e.toNodeId === to.id,
    );
    if (existing) {
      existing.kind = "handoff";
      existing.handoffId = h.id;
    } else {
      edges.push({
        id: `vedge_h_${h.id}`,
        fromNodeId: from.id,
        toNodeId: to.id,
        handoffId: h.id,
        kind: "handoff",
      });
    }
  }

  return { nodes, edges };
}

export function deriveStudioMetrics(input: {
  workflow: ProcessWorkflow;
  approvalCount: number;
  documentCount: number;
  automationOpportunityCount: number;
}): ProcessStudioMetrics {
  const steps = input.workflow.steps;
  const departments = new Set(
    steps
      .map((s) => departmentFromActor(s.actor))
      .filter((d): d is string => d != null),
  );
  const manualSteps = steps.filter((s) => s.manual).length;
  const minutes = steps
    .map((s) => parseDurationMinutes(s.estimatedDuration))
    .filter((n): n is number => n != null);
  const avg =
    minutes.length > 0
      ? minutes.reduce((a, b) => a + b, 0) / minutes.length
      : null;

  const riskLevel = highestRisk(steps.map((s) => s.riskLevel));
  const processHealth =
    Math.round(
      ((1 - input.workflow.metrics.riskScore) * 0.5 +
        input.workflow.metrics.automationScore * 0.25 +
        input.workflow.metrics.documentationScore * 0.25) *
        100,
    ) / 100;

  const knownSteps = steps.filter(
    (s) =>
      !s.actorUnknown &&
      !s.inputs.some((i) => /^unknown/i.test(i)) &&
      !s.outputs.some((o) => /^unknown/i.test(o)),
  ).length;
  const coverage =
    steps.length === 0 ? 0 : Math.round((knownSteps / steps.length) * 100) / 100;

  return {
    totalSteps: steps.length,
    departments: Math.max(departments.size, input.workflow.department ? 1 : 0),
    manualSteps,
    automationOpportunities: input.automationOpportunityCount,
    approvals: input.approvalCount,
    documents: input.documentCount,
    averageDurationLabel: avg != null ? formatMinutes(avg) : "Desconocida",
    averageDurationMinutes: avg,
    riskLevel,
    processHealth,
    coverage,
  };
}

export function buildDependencyPanel(
  step: ProcessStep,
  extras: {
    documents: string[];
    approvals: string[];
    policies: string[];
  },
): VizDependencyPanel {
  return {
    stepId: step.id,
    documents: extras.documents,
    systems: step.systemsUsed,
    roles: step.actorUnknown ? [] : [step.actor],
    approvals: extras.approvals,
    policies: extras.policies,
    inputs: step.inputs.filter((i) => !/^unknown/i.test(i)),
    outputs: step.outputs.filter((o) => !/^unknown/i.test(o)),
  };
}

export function departmentFromActor(actor: string): string | null {
  const n = actor.toLowerCase();
  if (/unknown/i.test(n)) return null;
  if (/sales|account exec|rep/i.test(n)) return "Sales";
  if (/purchas|buyer/i.test(n)) return "Purchasing";
  if (/financ|account|controller|ar|ap/i.test(n)) return "Finance";
  if (/product|operator|plant/i.test(n)) return "Production";
  if (/warehous|picker|ship/i.test(n)) return "Warehouse";
  if (/tech|field|maintain/i.test(n)) return "Maintenance";
  if (/hr|people/i.test(n)) return "HR";
  if (/owner|ceo|founder|manager/i.test(n)) return "Management";
  if (/customer/i.test(n)) return "Customer";
  return "Operations";
}

export function parseDurationMinutes(label: string | null): number | null {
  if (!label) return null;
  const m = label.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(minute|minutes|min|hour|hours|hr|day|days|week|weeks)\b/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2];
  if (/week/.test(unit)) return n * 7 * 24 * 60;
  if (/day/.test(unit)) return n * 24 * 60;
  if (/hour|hr/.test(unit)) return n * 60;
  return n;
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${Math.round(mins)} minutes`;
  if (mins < 24 * 60) {
    const h = Math.round((mins / 60) * 10) / 10;
    return `${h} hours`;
  }
  const d = Math.round((mins / (24 * 60)) * 10) / 10;
  return `${d} days`;
}

function highestRisk(levels: ProcessRiskLevel[]): ProcessRiskLevel {
  const order: ProcessRiskLevel[] = ["low", "moderate", "high", "critical"];
  let best: ProcessRiskLevel = "low";
  for (const level of levels) {
    if (order.indexOf(level) > order.indexOf(best)) best = level;
  }
  return best;
}
