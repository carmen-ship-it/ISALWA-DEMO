import { createId } from "@/lib/utils";
import type {
  ProcessEvidenceRef,
  ProcessHandoff,
  ProcessRiskLevel,
  ProcessWorkflow,
} from "@/types";
import { actorLabel } from "./actors";

function handoffRisk(
  from: string,
  to: string,
  missing: string[],
): ProcessRiskLevel {
  if (from === "Unknown" || to === "Unknown") return "high";
  if (missing.length >= 2) return "high";
  if (missing.length === 1) return "moderate";
  if (from.toLowerCase() === to.toLowerCase()) return "low";
  return "moderate";
}

export function deriveHandoffs(
  workflows: ProcessWorkflow[],
  evidence: ProcessEvidenceRef[],
): ProcessHandoff[] {
  const handoffs: ProcessHandoff[] = [];

  for (const wf of workflows) {
    const ordered = [...wf.steps].sort((a, b) => a.order - b.order);
    for (let i = 0; i < ordered.length - 1; i++) {
      const fromStep = ordered[i];
      const toStep = ordered[i + 1];
      const from = actorLabel(fromStep);
      const to = actorLabel(toStep);
      if (from.toLowerCase() === to.toLowerCase()) continue;

      const requiredInformation = [
        ...fromStep.outputs.filter((o) => !/^unknown/i.test(o)),
        ...toStep.inputs.filter((inp) => !/^unknown/i.test(inp)),
      ].filter((v, idx, arr) => arr.indexOf(v) === idx);

      const missingInformation: string[] = [];
      if (fromStep.outputs.some((o) => /^unknown/i.test(o))) {
        missingInformation.push("Unknown output from prior step");
      }
      if (toStep.inputs.some((inp) => /^unknown/i.test(inp))) {
        missingInformation.push("Unknown required input for next step");
      }
      if (fromStep.actorUnknown || toStep.actorUnknown) {
        missingInformation.push("Missing ownership on handoff boundary");
      }

      handoffs.push({
        id: createId("phandoff"),
        workflowId: wf.id,
        from,
        to,
        fromStepId: fromStep.id,
        toStepId: toStep.id,
        requiredInformation,
        missingInformation,
        risk: handoffRisk(from, to, missingInformation),
        automationOpportunity:
          fromStep.manual || toStep.manual
            ? "Digitize handoff payload and notify next actor"
            : null,
        confidence: Math.min(fromStep.confidence, toStep.confidence),
        evidence: [
          {
            source: "blueprint",
            id: wf.blueprintWorkflowId,
            label: `${wf.name} handoff`,
          },
          ...evidence.slice(0, 1),
        ],
      });
    }
  }

  return handoffs;
}
