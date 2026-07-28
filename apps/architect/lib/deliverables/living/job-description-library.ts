/**
 * Mission 26 — Job Description Library.
 *
 * Strictly from Company Model roles and people (`workspace.companyModel`) —
 * never invents a title, department or responsibility the model doesn't
 * already carry.
 */

import { departmentLabel, roleLabel } from "@/lib/presentation";
import type {
  CompanyWorkspace,
  JobDescriptionDoc,
  JobDescriptionLibraryContent,
  LivingDeliverableEvidenceRef,
} from "@/types";
import { fromCompanyModelEvidence } from "./evidence";

export interface JobDescriptionLibraryGenerationResult {
  title: string;
  content: JobDescriptionLibraryContent;
  evidence: LivingDeliverableEvidenceRef[];
  missingInformation: string[];
  contentSignalCount: number;
}

export function generateJobDescriptionLibrary(
  workspace: CompanyWorkspace,
): JobDescriptionLibraryGenerationResult {
  const model = workspace.companyModel;
  const needsMoreKnowledge: string[] = [];

  if (!model || model.roles.length === 0) {
    needsMoreKnowledge.push(
      "Architect todavía no ha identificado roles formales — la biblioteca se completará conforme se documente el equipo.",
    );
    return {
      title: `Descripciones de Puesto de ${workspace.companyName}`,
      content: { jobs: [], needsMoreKnowledge },
      evidence: [],
      missingInformation: needsMoreKnowledge,
      contentSignalCount: 0,
    };
  }

  const departmentById = new Map(model.departments.map((d) => [d.id, d]));
  const personById = new Map(model.people.map((p) => [p.id, p]));

  const jobs: JobDescriptionDoc[] = model.roles.map((role) => {
    const department = role.departmentId ? departmentById.get(role.departmentId) : null;
    const peopleAssigned = role.personIds
      .map((id) => personById.get(id)?.name)
      .filter((name): name is string => Boolean(name));

    const missingKnowledge: string[] = [];
    if (role.responsibilities.length === 0) {
      missingKnowledge.push("Responsabilidades del puesto sin documentar todavía.");
    }
    if (peopleAssigned.length === 0) {
      missingKnowledge.push("Sin persona confirmada en este rol todavía.");
    }

    return {
      id: role.id,
      roleName: roleLabel(role.name),
      department: department ? departmentLabel(department.name) : null,
      peopleAssigned,
      responsibilities: role.responsibilities,
      missingKnowledge,
    };
  });

  if (jobs.some((j) => j.missingKnowledge.length > 0)) {
    needsMoreKnowledge.push("Algunos puestos tienen responsabilidades o titulares sin confirmar — ver cada descripción.");
  }

  return {
    title: `Descripciones de Puesto de ${workspace.companyName}`,
    content: { jobs, needsMoreKnowledge },
    evidence: fromCompanyModelEvidence(model.evidence),
    missingInformation: needsMoreKnowledge,
    contentSignalCount: jobs.length,
  };
}
