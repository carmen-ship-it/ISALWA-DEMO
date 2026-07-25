import { createId } from "@/lib/utils";
import type {
  ProcessAutomationCandidate,
  ProcessEvidenceRef,
  ProcessWorkflow,
} from "@/types";

export function deriveAutomationCandidates(
  workflows: ProcessWorkflow[],
  evidence: ProcessEvidenceRef[],
): ProcessAutomationCandidate[] {
  const candidates: ProcessAutomationCandidate[] = [];

  for (const wf of workflows) {
    const manualSteps = wf.steps.filter((s) => s.manual);
    const aiSteps = wf.steps.filter((s) => s.aiOpportunity != null);

    if (manualSteps.length > 0) {
      const first = manualSteps[0];
      candidates.push({
        id: createId("pauto"),
        workflowId: wf.id,
        stepId: first.id,
        quickAutomation: first.manual
          ? `Digitize “${first.name}” and capture structured inputs`
          : null,
        futureAutomation:
          manualSteps.length > 1
            ? `End-to-end automation across ${manualSteps.length} manual steps`
            : `System-enforce “${first.name}” with audit trail`,
        aiOpportunity: first.aiOpportunity,
        estimatedImpact:
          wf.metrics.automationScore < 0.4
            ? "High — process is mostly manual today"
            : "Moderate — selective step automation",
        confidence: Math.min(0.9, first.confidence + 0.05),
        evidence: [
          {
            source: "blueprint",
            id: wf.blueprintWorkflowId,
            label: wf.name,
          },
          ...evidence.slice(0, 1),
        ],
      });
    }

    for (const step of aiSteps.slice(0, 2)) {
      if (candidates.some((c) => c.stepId === step.id)) continue;
      candidates.push({
        id: createId("pauto"),
        workflowId: wf.id,
        stepId: step.id,
        quickAutomation: null,
        futureAutomation: `Automate supporting workflow around “${step.name}”`,
        aiOpportunity: step.aiOpportunity,
        estimatedImpact: "AI-assisted step reduces cycle time and rework",
        confidence: step.confidence,
        evidence: [
          {
            source: "blueprint",
            id: step.blueprintStepId,
            label: step.name,
          },
          ...evidence.slice(0, 1),
        ],
      });
    }

    if (
      candidates.filter((c) => c.workflowId === wf.id).length === 0 &&
      wf.steps.length > 0
    ) {
      candidates.push({
        id: createId("pauto"),
        workflowId: wf.id,
        stepId: null,
        quickAutomation: null,
        futureAutomation: "Monitor for automation once steps are fully known",
        aiOpportunity: null,
        estimatedImpact: "Unknown — insufficient automation evidence",
        confidence: 0.4,
        evidence: evidence.slice(0, 1),
      });
    }
  }

  return candidates;
}
