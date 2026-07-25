import { createId } from "@/lib/utils";
import type {
  ProcessActor,
  ProcessEvidenceRef,
  ProcessStep,
  ProcessWorkflow,
} from "@/types";

function inferDepartment(actor: string): string | null {
  const n = actor.toLowerCase();
  if (/sales|account exec|rep/i.test(n)) return "Sales";
  if (/purchas|buyer|procurement/i.test(n)) return "Purchasing";
  if (/financ|account|controller|ar|ap/i.test(n)) return "Finance";
  if (/product|operator|plant/i.test(n)) return "Production";
  if (/warehous|picker|ship/i.test(n)) return "Warehouse";
  if (/tech|field|maintain/i.test(n)) return "Maintenance";
  if (/hr|people/i.test(n)) return "HR";
  if (/owner|ceo|founder|manager/i.test(n)) return "Management";
  if (/customer/i.test(n)) return "Customer";
  return null;
}

export function deriveActors(
  workflows: ProcessWorkflow[],
  evidence: ProcessEvidenceRef[],
): ProcessActor[] {
  const byName = new Map<
    string,
    {
      name: string;
      stepIds: string[];
      workflowIds: string[];
      confidences: number[];
    }
  >();

  for (const wf of workflows) {
    for (const step of wf.steps) {
      const key = step.actor.toLowerCase();
      const existing = byName.get(key) ?? {
        name: step.actor,
        stepIds: [],
        workflowIds: [],
        confidences: [],
      };
      existing.stepIds.push(step.id);
      if (!existing.workflowIds.includes(wf.id)) {
        existing.workflowIds.push(wf.id);
      }
      existing.confidences.push(step.confidence);
      byName.set(key, existing);
    }
  }

  return Array.from(byName.values()).map((entry) => {
    const avg =
      entry.confidences.reduce((a, b) => a + b, 0) / entry.confidences.length;
    return {
      id: createId("pactor"),
      name: entry.name,
      department: inferDepartment(entry.name),
      stepIds: entry.stepIds,
      workflowIds: entry.workflowIds,
      confidence: Math.round(avg * 100) / 100,
      evidence: evidence.slice(0, 2),
    };
  });
}

export function attachActorIds(
  workflows: ProcessWorkflow[],
  actors: ProcessActor[],
): ProcessWorkflow[] {
  return workflows.map((wf) => ({
    ...wf,
    actorIds: actors
      .filter((a) => a.workflowIds.includes(wf.id))
      .map((a) => a.id),
  }));
}

/** Helper for handoff department labeling from step actors. */
export function actorLabel(step: ProcessStep): string {
  return step.actorUnknown ? "Unknown" : step.actor;
}
