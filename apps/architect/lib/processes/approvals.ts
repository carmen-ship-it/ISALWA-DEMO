import { createId } from "@/lib/utils";
import type {
  ProcessApproval,
  ProcessEvidenceRef,
  ProcessRiskLevel,
  ProcessWorkflow,
  SolutionApprovalRule,
} from "@/types";

function isApprovalStep(name: string, actor: string): boolean {
  return /approv|sign[- ]?off|authorize|authorization/i.test(
    `${name} ${actor}`,
  );
}

function delayRisk(manual: boolean, actor: string): ProcessRiskLevel {
  if (/owner|ceo|founder/i.test(actor)) return "high";
  if (manual) return "moderate";
  return "low";
}

function matchSolutionRule(
  stepName: string,
  rules: SolutionApprovalRule[],
): string | null {
  const blob = stepName.toLowerCase();
  const hit = rules.find((r) =>
    r.statement
      .toLowerCase()
      .split(/\s+/)
      .some((token) => token.length > 4 && blob.includes(token)),
  );
  return hit?.id ?? rules[0]?.id ?? null;
}

export function deriveApprovals(input: {
  workflows: ProcessWorkflow[];
  solutionApprovalRules: SolutionApprovalRule[];
  evidence: ProcessEvidenceRef[];
}): ProcessApproval[] {
  const approvals: ProcessApproval[] = [];

  for (const wf of input.workflows) {
    for (const step of wf.steps) {
      if (!isApprovalStep(step.name, step.actor)) continue;
      approvals.push({
        id: createId("paprov"),
        workflowId: wf.id,
        stepId: step.id,
        name: step.name.includes("Appro")
          ? step.name
          : `${step.actor} approval`,
        criteria:
          step.description.includes("decision")
            ? step.description
            : `Authority held by ${step.actor}`,
        authority: step.actorUnknown ? "Unknown" : step.actor,
        delayRisk: delayRisk(step.manual, step.actor),
        solutionApprovalRuleId: matchSolutionRule(
          step.name,
          input.solutionApprovalRules,
        ),
        confidence: step.confidence,
        evidence: [
          {
            source: "blueprint",
            id: step.blueprintStepId,
            label: step.name,
          },
          ...(input.solutionApprovalRules[0]
            ? [
                {
                  source: "solution" as const,
                  id: input.solutionApprovalRules[0].id,
                  label: "Solution approval rule",
                },
              ]
            : []),
          ...input.evidence.slice(0, 1),
        ],
      });
    }

    // Blueprint workflows named around approvals without matching step labels
    if (
      /approv/i.test(wf.name) &&
      !approvals.some((a) => a.workflowId === wf.id)
    ) {
      approvals.push({
        id: createId("paprov"),
        workflowId: wf.id,
        stepId: wf.steps.find((s) => s.manual)?.id ?? null,
        name: wf.name,
        criteria: `Workflow trigger: ${wf.trigger}`,
        authority: wf.owner ?? "Unknown",
        delayRisk: "moderate",
        solutionApprovalRuleId: input.solutionApprovalRules[0]?.id ?? null,
        confidence: 0.7,
        evidence: [
          {
            source: "blueprint",
            id: wf.blueprintWorkflowId,
            label: wf.name,
          },
          ...input.evidence.slice(0, 1),
        ],
      });
    }
  }

  return approvals;
}
