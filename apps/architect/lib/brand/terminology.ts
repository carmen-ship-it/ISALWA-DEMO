import { departmentLabel, entityLabel } from "@/lib/presentation";
import { createId } from "@/lib/utils";
import type {
  BrandEvidenceRef,
  BrandRecommendation,
  BusinessBlueprint,
  CompanyWorkspace,
  FormalityLevel,
  TerminologyEntry,
  TerminologyProfile,
} from "@/types";
import { collectFactBlob, evidenceSubset } from "./evidence";

function recommendation<T>(
  value: T | null,
  confidence: number,
  reasoning: string,
  evidence: BrandEvidenceRef[],
): BrandRecommendation<T> {
  return { value, confidence, reasoning, evidence };
}

const DOMAIN_TERMS: Array<{
  term: string;
  labels: Record<string, string>;
  context: string;
}> = [
  {
    term: "Customer",
    labels: { manufacturing: "Cliente", healthcare: "Paciente", distribution: "Cuenta" },
    context: "Parte externa principal",
  },
  {
    term: "Order",
    labels: { manufacturing: "Orden de trabajo", distribution: "Pedido", retail: "Pedido" },
    context: "Unidad de transacción comercial",
  },
  {
    term: "Employee",
    labels: { manufacturing: "Miembro del equipo", healthcare: "Personal", services: "Consultor" },
    context: "Referencia de usuario interno",
  },
];

const TERM_NAME_ES: Record<string, string> = {
  Customer: "Cliente",
  Order: "Pedido",
  Employee: "Empleado",
  Department: "Departamento",
};

export function deriveTerminology(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  evidence: BrandEvidenceRef[],
): TerminologyProfile {
  const industry = workspace.industry;
  const factBlob = collectFactBlob(workspace);
  const entries: TerminologyEntry[] = [];
  const ev = evidenceSubset(evidence, ["blueprint", "industry", "meeting"], 3);

  for (const mapping of DOMAIN_TERMS) {
    const label =
      industry !== "unknown" && mapping.labels[industry]
        ? mapping.labels[industry]
        : null;

    if (label && factBlob.includes(mapping.term.toLowerCase())) {
      entries.push({
        id: createId("term"),
        term: TERM_NAME_ES[mapping.term] ?? mapping.term,
        preferredLabel: label,
        context: mapping.context,
        confidence: 0.55,
        evidence: ev,
      });
    }
  }

  for (const dept of blueprint.departments.slice(0, 6)) {
    entries.push({
      id: createId("term"),
      term: TERM_NAME_ES.Department,
      // Bilingual leakage fix — the blueprint's canonical department name
      // (e.g. "Sales") is an internal English key used for matching against
      // people/workflows elsewhere; the client-facing label must always be
      // the same Spanish translation `departmentLabel()` already gives the
      // Departments section, so a Sales entry never reads "Sales" here
      // while showing "Ventas" two lines away.
      preferredLabel: departmentLabel(dept.name),
      context: dept.purpose || "Unidad organizacional del plan de negocio",
      confidence: 0.72,
      evidence: evidenceSubset(evidence, ["blueprint"], 2),
    });
  }

  for (const entity of blueprint.entities.slice(0, 4)) {
    entries.push({
      id: createId("term"),
      term: entityLabel(entity.name),
      preferredLabel: entityLabel(entity.name),
      context: entity.purpose || "Entidad del catálogo del plan de negocio",
      confidence: 0.68,
      evidence: evidenceSubset(evidence, ["blueprint"], 2),
    });
  }

  const spanishHint = /español|spanish|méxico|latam/i.test(factBlob);
  const localeDefault = spanishHint
    ? recommendation("es", 0.58, "Spanish terminology context from discovery.", ev)
    : recommendation<string>(null, 0, "Default locale unknown.", []);

  let formality: BrandRecommendation<FormalityLevel> = recommendation(
    "neutral",
    0.4,
    "Neutral formality assumed until brand voice is evidenced.",
    ev,
  );

  if (workspace.industry === "healthcare") {
    formality = recommendation("formal", 0.55, "Regulated industries tend toward formal UI copy.", ev);
  } else if (/casual|friendly|informal/i.test(factBlob)) {
    formality = recommendation("casual", 0.6, "Informal language detected in discovery.", ev);
  }

  return {
    entries: dedupeEntries(entries),
    localeDefault,
    formality,
  };
}

function dedupeEntries(entries: TerminologyEntry[]): TerminologyEntry[] {
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = `${e.term}:${e.preferredLabel}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
