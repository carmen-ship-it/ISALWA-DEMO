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
    return "High AI opportunity — structured decision or extraction";
  }
  if (step.automationPotential === "medium") {
    return "Medium AI opportunity — assist actor with draft or triage";
  }
  if (step.manual && /calculat|classif|match|extract|summar/i.test(step.name)) {
    return "AI opportunity inferred from manual calculation/classification step";
  }
  return null;
}

function descriptionFor(step: BlueprintWorkflowStep): string {
  if (!isBlank(step.decision)) {
    return `${step.name}: decision — ${step.decision}`;
  }
  const parts = [
    !isBlank(step.input) ? `Input: ${step.input}` : null,
    !isBlank(step.output) ? `Output: ${step.output}` : null,
  ].filter(Boolean);
  if (parts.length === 0) {
    return "Unknown step detail — not described in blueprint evidence";
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
      inputs: isBlank(step.input) ? ["Unknown input"] : [step.input],
      outputs: isBlank(step.output) ? ["Unknown output"] : [step.output],
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
