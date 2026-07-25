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
    labels: { manufacturing: "Customer", healthcare: "Patient", distribution: "Account" },
    context: "Primary external party",
  },
  {
    term: "Order",
    labels: { manufacturing: "Work Order", distribution: "Order", retail: "Order" },
    context: "Commercial transaction unit",
  },
  {
    term: "Employee",
    labels: { manufacturing: "Team Member", healthcare: "Staff", services: "Consultant" },
    context: "Internal user reference",
  },
];

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
        term: mapping.term,
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
      term: "Department",
      preferredLabel: dept.name,
      context: dept.purpose || "Organizational unit from blueprint",
      confidence: 0.72,
      evidence: evidenceSubset(evidence, ["blueprint"], 2),
    });
  }

  for (const entity of blueprint.entities.slice(0, 4)) {
    entries.push({
      id: createId("term"),
      term: entity.name,
      preferredLabel: entity.name,
      context: entity.purpose || "Entity from blueprint catalog",
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
