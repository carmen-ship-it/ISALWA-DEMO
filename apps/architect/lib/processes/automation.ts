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
          ? `Digitalizar “${first.name}” y capturar datos estructurados`
          : null,
        futureAutomation:
          manualSteps.length > 1
            ? `Automatización de extremo a extremo en ${manualSteps.length} pasos manuales`
            : `Reforzar “${first.name}” con el sistema y dejar rastro de auditoría`,
        aiOpportunity: first.aiOpportunity,
        estimatedImpact:
          wf.metrics.automationScore < 0.4
            ? "Alto — el proceso hoy es mayormente manual"
            : "Moderado — automatización selectiva de pasos",
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
        futureAutomation: `Automatizar el flujo de soporte alrededor de “${step.name}”`,
        aiOpportunity: step.aiOpportunity,
        estimatedImpact: "El paso asistido por IA reduce el tiempo de ciclo y el retrabajo",
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
        futureAutomation: "Vigilar oportunidades de automatización una vez que los pasos estén completamente definidos",
        aiOpportunity: null,
        estimatedImpact: "Desconocido — evidencia insuficiente de automatización",
        confidence: 0.4,
        evidence: evidence.slice(0, 1),
      });
    }
  }

  return candidates;
}
