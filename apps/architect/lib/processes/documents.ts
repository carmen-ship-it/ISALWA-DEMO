import { createId } from "@/lib/utils";
import type {
  ProcessDocumentRef,
  ProcessEvidenceRef,
  ProcessWorkflow,
} from "@/types";

export function deriveDocuments(
  workflows: ProcessWorkflow[],
  evidence: ProcessEvidenceRef[],
): ProcessDocumentRef[] {
  const docs: ProcessDocumentRef[] = [];

  for (const wf of workflows) {
    for (const step of wf.steps) {
      for (const name of step.documentsUsed) {
        docs.push({
          id: createId("pdoc"),
          workflowId: wf.id,
          stepId: step.id,
          name,
          role: "supporting",
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
      for (const name of step.inputs) {
        if (/form|invoice|quote|order|po|sheet|pdf|doc|email/i.test(name)) {
          docs.push({
            id: createId("pdoc"),
            workflowId: wf.id,
            stepId: step.id,
            name,
            role: "input",
            confidence: step.confidence,
            evidence: evidence.slice(0, 1),
          });
        }
      }
      for (const name of step.outputs) {
        if (/form|invoice|quote|order|po|sheet|pdf|doc|report/i.test(name)) {
          docs.push({
            id: createId("pdoc"),
            workflowId: wf.id,
            stepId: step.id,
            name,
            role: "output",
            confidence: step.confidence,
            evidence: evidence.slice(0, 1),
          });
        }
      }
    }
  }

  return docs;
}
