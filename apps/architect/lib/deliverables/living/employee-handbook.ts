/**
 * Mission 26 — Employee Handbook.
 *
 * Sections come only from knowledge Architect actually holds — Company
 * Model departments/roles, Blueprint operating rules with real enforcement,
 * and the system inventory. When none of that exists yet, the handbook says
 * so plainly instead of inventing HR policy Architect was never told.
 */

import { latestBlueprint } from "@/lib/blueprint";
import { departmentLabel, roleLabel, systemPurposeLabel } from "@/lib/presentation";
import type {
  CompanyWorkspace,
  EmployeeHandbookContent,
  EmployeeHandbookSection,
  LivingDeliverableEvidenceRef,
} from "@/types";
import { fromCompanyModelEvidence } from "./evidence";

export interface EmployeeHandbookGenerationResult {
  title: string;
  content: EmployeeHandbookContent;
  evidence: LivingDeliverableEvidenceRef[];
  missingInformation: string[];
  contentSignalCount: number;
}

export function generateEmployeeHandbook(
  workspace: CompanyWorkspace,
): EmployeeHandbookGenerationResult {
  const model = workspace.companyModel;
  const blueprint = latestBlueprint(workspace.blueprints);
  const sections: EmployeeHandbookSection[] = [];
  const needsMoreKnowledge: string[] = [];

  if (model && model.departments.length > 0) {
    sections.push({
      title: "Estructura de la empresa",
      body: `${workspace.companyName} organiza su trabajo en ${model.departments.length} ${
        model.departments.length === 1 ? "área" : "áreas"
      }: ${model.departments.map((d) => departmentLabel(d.name)).join(", ")}.`,
    });
  } else {
    needsMoreKnowledge.push("Estructura de departamentos");
  }

  if (model && model.roles.length > 0) {
    sections.push({
      title: "Roles y responsabilidades",
      body: model.roles
        .slice(0, 8)
        .map(
          (r) =>
            `${roleLabel(r.name)}${
              r.responsibilities.length > 0 ? `: ${r.responsibilities.join("; ")}` : " — responsabilidades aún no documentadas"
            }.`,
        )
        .join(" "),
    });
  } else {
    needsMoreKnowledge.push("Roles y responsabilidades del equipo");
  }

  const realRules = (blueprint?.operatingRules ?? []).filter((r) => r.enforcement !== "unknown");
  if (realRules.length > 0) {
    sections.push({
      title: "Políticas identificadas",
      body: realRules.map((r) => r.statement).join(" "),
    });
  } else {
    needsMoreKnowledge.push("Políticas formales de la empresa");
  }

  if (model && model.systems.length > 0) {
    sections.push({
      title: "Herramientas de trabajo",
      body: `El equipo trabaja hoy con: ${model.systems.map((s) => `${s.name} (${systemPurposeLabel(s.name, s.purpose)})`).join(", ")}.`,
    });
  } else {
    needsMoreKnowledge.push("Inventario de sistemas y herramientas");
  }

  const hasContent = sections.length > 0;
  if (!hasContent) {
    needsMoreKnowledge.push(
      "Architect todavía no tiene evidencia suficiente para construir un manual del empleado — se completará con cada documento, reunión o respuesta nueva.",
    );
  }

  const evidence: LivingDeliverableEvidenceRef[] = model
    ? fromCompanyModelEvidence(model.evidence)
    : blueprint
      ? [{ source: "blueprint", id: blueprint.id, label: `Blueprint v${blueprint.version}` }]
      : [];

  return {
    title: `Manual del Empleado de ${workspace.companyName}`,
    content: { hasContent, sections, needsMoreKnowledge },
    evidence,
    missingInformation: needsMoreKnowledge,
    contentSignalCount: sections.length,
  };
}
