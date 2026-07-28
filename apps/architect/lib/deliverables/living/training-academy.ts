/**
 * Mission 26 — Training Academy.
 *
 * Generates a training outline per discovered process
 * (`workspace.businessProcesses`) — objectives and outline steps read
 * straight from `ProcessWorkflow`. Videos, quizzes and certificates are not
 * built; the roadmap for them is reported honestly as future work, per the
 * mission brief, never presented as a shipped feature.
 */

import { actorNameLabel, stepNameLabel, workflowNameLabel } from "@/lib/presentation";
import type {
  CompanyWorkspace,
  LivingDeliverableEvidenceRef,
  TrainingAcademyContent,
  TrainingModuleOutline,
} from "@/types";
import { fromProcessEvidence } from "./evidence";

const FUTURE_ROADMAP = [
  "Videos de capacitación grabados por proceso (aún no producidos).",
  "Quizzes de verificación de comprensión al final de cada módulo (aún no construidos).",
  "Certificados internos por módulo completado (aún no construidos).",
];

export interface TrainingAcademyGenerationResult {
  title: string;
  content: TrainingAcademyContent;
  evidence: LivingDeliverableEvidenceRef[];
  missingInformation: string[];
  contentSignalCount: number;
}

export function generateTrainingAcademy(
  workspace: CompanyWorkspace,
): TrainingAcademyGenerationResult {
  const processes = workspace.businessProcesses;
  const needsMoreKnowledge: string[] = [];

  if (!processes || processes.workflows.length === 0) {
    needsMoreKnowledge.push(
      "Architect todavía no ha mapeado procesos — los módulos de capacitación se generarán conforme existan flujos documentados.",
    );
    return {
      title: `Academia de Capacitación de ${workspace.companyName}`,
      content: { modules: [], futureRoadmap: FUTURE_ROADMAP, needsMoreKnowledge },
      evidence: [],
      missingInformation: needsMoreKnowledge,
      contentSignalCount: 0,
    };
  }

  const actorsById = new Map(processes.actors.map((a) => [a.id, a]));

  const modules: TrainingModuleOutline[] = processes.workflows.map((wf) => {
    const audienceNames = wf.actorIds
      .map((id) => actorsById.get(id)?.name)
      .filter((n): n is string => Boolean(n));

    return {
      id: wf.id,
      title: `Cómo operar: ${workflowNameLabel(wf.name)}`,
      audience: audienceNames.length > 0 ? audienceNames.join(", ") : "Equipo responsable (por confirmar)",
      objectives: [wf.purpose, `Ejecutar correctamente ${wf.steps.length} pasos sin depender de una sola persona.`],
      outline: wf.steps
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((s) => `${s.order}. ${stepNameLabel(s.name)} (${actorNameLabel(s.actor)})`),
    };
  });

  return {
    title: `Academia de Capacitación de ${workspace.companyName}`,
    content: { modules, futureRoadmap: FUTURE_ROADMAP, needsMoreKnowledge },
    evidence: fromProcessEvidence(processes.evidence),
    missingInformation: needsMoreKnowledge,
    contentSignalCount: modules.length,
  };
}
