import { createId } from "@/lib/utils";
import type {
  BlueprintWorkflow,
  ProcessEvidenceRef,
  ProcessException,
  ProcessWorkflow,
} from "@/types";

export function deriveExceptions(
  workflows: ProcessWorkflow[],
  blueprintById: Map<string, BlueprintWorkflow>,
  evidence: ProcessEvidenceRef[],
): ProcessException[] {
  const exceptions: ProcessException[] = [];

  for (const wf of workflows) {
    const bw = blueprintById.get(wf.blueprintWorkflowId);
    for (const description of bw?.exceptions ?? []) {
      exceptions.push({
        id: createId("pex"),
        workflowId: wf.id,
        description,
        confidence: 0.8,
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
  }

  return exceptions;
}
