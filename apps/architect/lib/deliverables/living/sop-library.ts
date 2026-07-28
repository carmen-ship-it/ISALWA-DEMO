/**
 * Mission 26 — SOP Library.
 *
 * One SOP per process the Business Process Engine already discovered
 * (`lib/processes`, `workspace.businessProcesses`) — never a second process
 * model. Steps, owner, systems and exceptions are read straight off
 * `ProcessWorkflow`; anything the engine itself marked unknown (unresolved
 * actor, `unknown_steps` status, missing handoff information) surfaces as
 * this SOP's own "Missing Knowledge" list.
 */

import { actorNameLabel, stepNameLabel, triggerLabel, workflowNameLabel } from "@/lib/presentation";
import type {
  CompanyWorkspace,
  LivingDeliverableEvidenceRef,
  SopDocument,
  SopLibraryContent,
} from "@/types";
import { fromProcessEvidence } from "./evidence";

export interface SopLibraryGenerationResult {
  title: string;
  content: SopLibraryContent;
  evidence: LivingDeliverableEvidenceRef[];
  missingInformation: string[];
  contentSignalCount: number;
}

export function generateSopLibrary(
  workspace: CompanyWorkspace,
): SopLibraryGenerationResult {
  const processes = workspace.businessProcesses;
  const needsMoreKnowledge: string[] = [];

  if (!processes || processes.workflows.length === 0) {
    needsMoreKnowledge.push(
      "Architect todavía no ha mapeado procesos operativos — la biblioteca se llenará conforme se documenten flujos de trabajo.",
    );
    return {
      title: `Biblioteca de Procedimientos de ${workspace.companyName}`,
      content: { sops: [], needsMoreKnowledge },
      evidence: [],
      missingInformation: needsMoreKnowledge,
      contentSignalCount: 0,
    };
  }

  const sops: SopDocument[] = processes.workflows.map((wf) => {
    const exceptions = processes.exceptions
      .filter((e) => e.workflowId === wf.id)
      .map((e) => e.description);
    const handoffGaps = processes.handoffs
      .filter((h) => h.workflowId === wf.id)
      .flatMap((h) => h.missingInformation);

    const missingKnowledge: string[] = [...handoffGaps];
    if (wf.status === "unknown_steps" || wf.status === "inferred") {
      missingKnowledge.push(`Pasos de "${workflowNameLabel(wf.name)}" aún no confirmados por evidencia directa.`);
    }
    const unresolvedActors = wf.steps.filter((s) => s.actorUnknown).map((s) => stepNameLabel(s.name));
    if (unresolvedActors.length > 0) {
      missingKnowledge.push(`Responsable sin confirmar en: ${unresolvedActors.join(", ")}.`);
    }
    if (!wf.owner) {
      missingKnowledge.push("Dueño del proceso sin confirmar.");
    }

    const systemsUsed = Array.from(
      new Set(wf.steps.flatMap((s) => s.systemsUsed)),
    );

    return {
      id: wf.id,
      processName: workflowNameLabel(wf.name),
      purpose: wf.purpose,
      owner: wf.owner,
      trigger: triggerLabel(wf.trigger),
      steps: wf.steps.map((s) => ({
        order: s.order,
        name: stepNameLabel(s.name),
        actor: actorNameLabel(s.actor),
        description: s.description,
      })),
      systemsUsed,
      exceptions,
      missingKnowledge,
    };
  });

  if (sops.some((s) => s.missingKnowledge.length > 0)) {
    needsMoreKnowledge.push("Algunos procedimientos tienen pasos o responsables sin confirmar — ver cada SOP.");
  }

  return {
    title: `Biblioteca de Procedimientos de ${workspace.companyName}`,
    content: { sops, needsMoreKnowledge },
    evidence: fromProcessEvidence(processes.evidence),
    missingInformation: needsMoreKnowledge,
    contentSignalCount: sops.length,
  };
}
