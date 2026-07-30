import { createId } from "@/lib/utils";
import type {
  BlueprintWorkflowStep,
  ProcessEvidenceRef,
  ProcessRiskLevel,
  ProcessStep,
} from "@/types";

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

function riskFromStep(step: BlueprintWorkflowStep): ProcessRiskLevel {
  const blob = `${step.name} ${step.painPoints.join(" ")}`.toLowerCase();
  if (/critical|block|stop|fail/i.test(blob)) return "critical";
  if (step.manual && /approv|wait|escalat/i.test(blob)) return "high";
  if (step.painPoints.length >= 2) return "high";
  if (step.manual) return "moderate";
  return "low";
}

function aiOpportunity(step: BlueprintWorkflowStep): string | null {
  if (step.automationPotential === "high") {
    return "Alta oportunidad de IA — decisión o extracción estructurada";
  }
  if (step.automationPotential === "medium") {
    return "Oportunidad media de IA — asistir al responsable con borrador o triage";
  }
  if (step.manual && /calculat|classif|match|extract|summar/i.test(step.name)) {
    return "Oportunidad de IA inferida de un paso manual de cálculo o clasificación";
  }
  return null;
}

function descriptionFor(step: BlueprintWorkflowStep): string {
  if (!isBlank(step.decision)) {
    return `${step.name}: decisión — ${step.decision}`;
  }
  const parts = [
    !isBlank(step.input) ? `Entrada: ${step.input}` : null,
    !isBlank(step.output) ? `Salida: ${step.output}` : null,
  ].filter(Boolean);
  if (parts.length === 0) {
    return "Detalle del paso sin confirmar — no descrito en la evidencia del plan de negocio";
  }
  return parts.join(". ");
}

export function deriveSteps(input: {
  blueprintSteps: BlueprintWorkflowStep[];
  workflowEvidence: ProcessEvidenceRef[];
  systems: string[];
}): ProcessStep[] {
  return input.blueprintSteps.map((step, index) => {
    const actorUnknown = isBlank(step.actor) || /^unknown$/i.test(step.actor);
    const systemsUsed = [
      ...(step.systemUsed ? [step.systemUsed] : []),
      ...input.systems.filter((s) =>
        step.name.toLowerCase().includes(s.toLowerCase().slice(0, 4)),
      ),
    ].filter((v, i, arr) => arr.indexOf(v) === i);

    const documentsUsed: string[] = [];
    const docHints = `${step.input} ${step.output}`;
    if (/form|invoice|po|quote|order|sheet|pdf|doc/i.test(docHints)) {
      const match = docHints.match(
        /(quote|order|invoice|purchase order|po|form|spreadsheet|pdf|document)[^,.]*/i,
      );
      if (match) documentsUsed.push(match[0].trim());
    }

    return {
      id: createId("pstep"),
      blueprintStepId: step.id,
      order: index + 1,
      name: step.name,
      description: descriptionFor(step),
      actor: actorUnknown ? "Unknown" : step.actor.trim(),
      actorUnknown,
      inputs: isBlank(step.input) ? ["Entrada por confirmar"] : [step.input],
      outputs: isBlank(step.output) ? ["Salida por confirmar"] : [step.output],
      systemsUsed,
      documentsUsed,
      estimatedDuration: step.estimatedTime,
      manual: step.manual,
      automated: !step.manual && step.automationPotential !== "none",
      aiOpportunity: aiOpportunity(step),
      riskLevel: riskFromStep(step),
      confidence: actorUnknown ? 0.45 : step.painPoints.length ? 0.82 : 0.75,
      evidence: [
        {
          source: "blueprint",
          id: step.id,
          label: step.name,
        },
        ...input.workflowEvidence.slice(0, 1),
      ],
    };
  });
}
