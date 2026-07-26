/**
 * 3. Who Should We Talk To Next — reuses Readiness (`lib/readiness`) evidence
 * coverage and the senior-consultant question planner's starved-dimension
 * ranking (`lib/consulting/questions`) for info gain, then points at the
 * most likely person from the Company Model / workspace people / blueprint
 * roles. Never invents a name — falls back to a role hint when no named
 * person is on record.
 */

import { starvedDimensions } from "@/lib/consulting/questions";
import type { CompanyWorkspace, DiscoveryDimension, DimensionStatus } from "@/types";
import { evidence } from "./shared";
import type { InsightEvidence, NextConversationRecommendation } from "./types";

const DIMENSION_DEPARTMENT_PATTERN: Record<DiscoveryDimension, RegExp | null> = {
  sales: /venta|comercial|sales/i,
  customers: /cliente|customer/i,
  operations: /operac|operations/i,
  finance: /financ|contab|finance/i,
  team: /rr\.?\s*hh|talento|personal|people|hr/i,
  production: /producci[oó]n|manufactur|production/i,
  systems: /\bti\b|sistemas|tecnolog|it\b/i,
  geography: null,
};

const DIMENSION_ROLE_HINT: Record<DiscoveryDimension, string> = {
  sales: "Responsable comercial",
  customers: "Responsable de atención a clientes",
  operations: "Responsable de operaciones",
  finance: "Responsable financiero",
  team: "Responsable de personas / RR. HH.",
  production: "Responsable de producción",
  systems: "Responsable de sistemas",
  geography: "Quien conozca la operación en cada plaza",
};

function findPersonForDimension(
  workspace: CompanyWorkspace,
  dimension: DiscoveryDimension,
): { name: string | null; departmentHint: string | null; evidence: InsightEvidence[] } {
  const pattern = DIMENSION_DEPARTMENT_PATTERN[dimension];
  if (!pattern) return { name: null, departmentHint: null, evidence: [] };

  const companyModel = workspace.companyModel;
  if (companyModel) {
    const dept = companyModel.departments.find((d) => pattern.test(d.name));
    if (dept) {
      const person = companyModel.people.find((p) => p.departmentId === dept.id);
      if (person) {
        return {
          name: person.name,
          departmentHint: dept.name,
          evidence: person.evidence.slice(0, 2).map((e) =>
            evidence("person", person.id, person.name, e.label),
          ),
        };
      }
      return { name: null, departmentHint: dept.name, evidence: [] };
    }
  }

  const person = workspace.people.find(
    (p) => (p.department && pattern.test(p.department)) || (p.role && pattern.test(p.role)),
  );
  if (person) {
    return {
      name: person.name,
      departmentHint: person.department,
      evidence: [evidence("person", person.id, person.name, person.role ?? person.department ?? person.name)],
    };
  }

  return { name: null, departmentHint: null, evidence: [] };
}

export function deriveNextConversations(
  workspace: CompanyWorkspace,
): NextConversationRecommendation[] {
  const memory = workspace.conversationMemory;
  if (!memory) return [];

  const order = starvedDimensions(memory);
  const dimensionStatus = new Map<DiscoveryDimension, DimensionStatus>(
    memory.score.dimensions.map((d) => [d.id, d]),
  );

  const recommendations: NextConversationRecommendation[] = [];

  for (const dimension of order.slice(0, 3)) {
    const status = dimensionStatus.get(dimension);
    if (!status || status.applicable === false) continue;
    if (status.covered && status.confidence >= 65) continue;

    const { name, departmentHint, evidence: personEvidence } = findPersonForDimension(
      workspace,
      dimension,
    );

    const gainLabel: NextConversationRecommendation["infoGainLabel"] =
      status.confidence < 30 ? "alta" : status.confidence < 60 ? "media" : "baja";

    recommendations.push({
      id: `next_${dimension}`,
      personName: name,
      roleHint: DIMENSION_ROLE_HINT[dimension],
      departmentHint,
      reason: name
        ? `${name} es quien más probablemente tiene la evidencia que falta sobre "${status.label}" (confianza actual ${status.confidence}%).`
        : `Aún no tenemos un nombre registrado, pero "${status.label}" (confianza actual ${status.confidence}%) es el vacío más grande — busque a ${DIMENSION_ROLE_HINT[dimension].toLowerCase()}.`,
      infoGainLabel: gainLabel,
      evidence: [
        evidence(
          "readiness",
          dimension,
          status.label,
          `Confianza en "${status.label}": ${status.confidence}%`,
        ),
        ...personEvidence,
      ],
    });
  }

  return recommendations;
}
