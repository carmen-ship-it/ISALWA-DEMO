import type {
  BlueprintDepartmentName,
  BlueprintWorkflow,
  ProcessEvidenceRef,
  ProcessWorkflow,
  ProcessWorkflowStatus,
} from "@/types";
import { createId } from "@/lib/utils";
import { deriveSteps } from "./steps";
import { deriveMetrics } from "./metrics";

function inferDepartment(
  workflow: BlueprintWorkflow,
): BlueprintDepartmentName | string | null {
  const blob = `${workflow.name} ${workflow.owner ?? ""} ${workflow.participants.join(" ")}`.toLowerCase();
  const pairs: Array<[RegExp, BlueprintDepartmentName]> = [
    [/sales|quote|order|crm/i, "Sales"],
    [/purchas|supplier|vendor/i, "Purchasing"],
    [/financ|invoice|collect|account/i, "Finance"],
    [/product|manufactur|shop/i, "Production"],
    [/warehous|inventor|ship/i, "Warehouse"],
    [/maintain|repair/i, "Maintenance"],
    [/support|service|ticket/i, "Support"],
    [/ops|operat|schedul/i, "Operations"],
    [/owner|ceo|manage/i, "Management"],
  ];
  for (const [re, dept] of pairs) {
    if (re.test(blob)) return dept;
  }
  return workflow.participants[0] ?? null;
}

function workflowStatus(
  stepCount: number,
  unknownActors: number,
  hasExceptions: boolean,
): ProcessWorkflowStatus {
  if (stepCount === 0) return "unknown_steps";
  if (unknownActors > 0) return "partial";
  if (hasExceptions) return "documented";
  return "documented";
}

export function deriveWorkflows(input: {
  blueprintWorkflows: BlueprintWorkflow[];
  evidence: ProcessEvidenceRef[];
  solutionWorkflowByName: Map<string, string>;
  knowledgeAssetIds: string[];
  consultingRiskIds: string[];
}): {
  workflows: ProcessWorkflow[];
} {
  const workflows: ProcessWorkflow[] = [];

  for (const bw of input.blueprintWorkflows) {
    const processId = createId("pwf");
    const steps = deriveSteps({
      blueprintSteps: bw.steps,
      workflowEvidence: [
        ...bw.evidence.map((e) => ({
          source: "blueprint" as const,
          id: e.id,
          label: e.label,
        })),
        ...input.evidence.slice(0, 2),
      ],
      systems: bw.systems,
    });

    const unknownActors = steps.filter((s) => s.actorUnknown).length;
    const status = workflowStatus(
      steps.length,
      unknownActors,
      bw.exceptions.length > 0,
    );

    const purpose =
      bw.outputs[0] != null
        ? `Produce ${bw.outputs[0]} a partir de ${bw.trigger}`
        : `Ejecuta ${bw.name} cuando ${bw.trigger}`;

    const metrics = deriveMetrics({
      steps,
      systems: bw.systems,
      exceptions: bw.exceptions,
      painPoints: bw.painPoints,
      metricsListed: bw.metrics,
    });

    const confidence =
      Math.round(
        ((bw.evidence.length > 0 ? 0.85 : 0.7) -
          unknownActors * 0.05 +
          (steps.length > 0 ? 0.05 : -0.2)) *
          100,
      ) / 100;

    workflows.push({
      id: processId,
      blueprintWorkflowId: bw.id,
      name: bw.name,
      department: inferDepartment(bw),
      purpose,
      trigger: bw.trigger,
      owner: bw.owner,
      confidence: Math.max(0.35, Math.min(0.95, confidence)),
      status,
      steps,
      actorIds: [],
      handoffIds: [],
      approvalIds: [],
      documentIds: [],
      exceptionIds: [],
      bottleneckIds: [],
      automationCandidateIds: [],
      metrics,
      solutionWorkflowId:
        input.solutionWorkflowByName.get(bw.name.toLowerCase()) ?? null,
      knowledgeAssetIds: input.knowledgeAssetIds.slice(0, 3),
      consultingRiskIds: input.consultingRiskIds.slice(0, 5),
      evidence: [
        {
          source: "blueprint",
          id: bw.id,
          label: bw.name,
        },
        ...input.evidence.slice(0, 2),
      ],
    });
  }

  return { workflows };
}
