/**
 * 8. Knowledge Concentration — where operational knowledge actually lives.
 * Reuses the Company Digital Twin (`lib/company-model`) departments/people
 * graph when available, falling back to `workspace.people`. No new mapping
 * of who-knows-what — just a concentration lens over what is already there.
 */

import type { CompanyWorkspace } from "@/types";
import { evidence } from "./shared";
import type { KnowledgeConcentrationNode, KnowledgeConcentrationSummary } from "./types";

export function deriveKnowledgeConcentration(
  workspace: CompanyWorkspace,
): KnowledgeConcentrationSummary {
  const model = workspace.companyModel;
  const nodes: KnowledgeConcentrationNode[] = [];

  if (model && model.departments.length > 0) {
    for (const dept of model.departments) {
      const people = model.people.filter((p) => p.departmentId === dept.id);
      if (people.length === 0) {
        nodes.push({
          id: dept.id,
          holder: dept.name,
          kind: "sin_dueño_claro",
          knowledgeAreas: [dept.purpose],
          concentrationRisk: "alta",
          evidence: [evidence("blueprint", dept.id, dept.name, dept.purpose)],
        });
        continue;
      }
      for (const person of people) {
        const roles = model.roles
          .filter((r) => person.roleIds.includes(r.id))
          .map((r) => r.name);
        const risk =
          people.length === 1 ? "alta" : roles.length >= 2 ? "media" : "baja";
        nodes.push({
          id: person.id,
          holder: person.name,
          kind: "person",
          knowledgeAreas: roles.length > 0 ? roles : [dept.name],
          concentrationRisk: risk,
          evidence: person.evidence
            .slice(0, 2)
            .map((e) => evidence("person", person.id, person.name, e.label)),
        });
      }
    }
  } else if (workspace.people.length > 0) {
    const byDepartment = new Map<string, typeof workspace.people>();
    for (const person of workspace.people) {
      const key = person.department ?? "Sin área asignada";
      byDepartment.set(key, [...(byDepartment.get(key) ?? []), person]);
    }
    for (const [department, people] of byDepartment) {
      for (const person of people) {
        nodes.push({
          id: person.id,
          holder: person.name,
          kind: "person",
          knowledgeAreas: [person.role ?? department],
          concentrationRisk: people.length === 1 ? "alta" : "media",
          evidence: [
            evidence("person", person.id, person.name, person.notes ?? person.role ?? department),
          ],
        });
      }
    }
  }

  const highRisk = nodes.filter((n) => n.concentrationRisk === "alta").length;
  const headline =
    nodes.length === 0
      ? "Aún no hay suficiente evidencia sobre personas o departamentos para mapear dónde vive el conocimiento."
      : highRisk > 0
        ? `${highRisk} de ${nodes.length} punto(s) de conocimiento dependen de una sola persona o no tienen dueño identificado.`
        : `El conocimiento parece repartido entre ${nodes.length} punto(s) — buena señal de continuidad.`;

  return { nodes: nodes.slice(0, 10), headline };
}
