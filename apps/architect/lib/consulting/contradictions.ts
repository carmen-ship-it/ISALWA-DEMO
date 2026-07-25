import { createId } from "@/lib/utils";
import type {
  ConversationMemory,
  PotentialContradiction,
} from "@/types";

interface ClaimPair {
  id: string;
  positive: RegExp;
  negative: RegExp;
  claimA: string;
  claimB: string;
  clarification: string;
}

const PAIRS: ClaimPair[] = [
  {
    id: "docs_vs_sops",
    positive: /we document everything|everything is documented|full documentation/i,
    negative: /no sop|don'?t have sops?|no documentation|undocumented/i,
    claimA: "Documentation is described as complete.",
    claimB: "Process documentation appears missing or incomplete.",
    clarification:
      "This may require clarification — documentation completeness and SOP availability seem inconsistent.",
  },
  {
    id: "system_vs_excel",
    positive: /we (have|use) (a |an )?(erp|crm|system)|everything is in the system/i,
    negative: /excel everywhere|live[s]? in excel|mostly (in )?spreadsheets/i,
    claimA: "A formal system is described as the source of truth.",
    claimB: "Day-to-day work still appears spreadsheet-led.",
    clarification:
      "This may require clarification — system-of-record claims and spreadsheet reliance may not align.",
  },
  {
    id: "process_vs_ad_hoc",
    positive: /we (have|follow) (a )?process|standardized|standard process/i,
    negative: /ad.?hoc|case by case|depends who|no standard/i,
    claimA: "Work is described as process-driven.",
    claimB: "Execution appears ad hoc or person-dependent.",
    clarification:
      "This may require clarification — stated process discipline and day-to-day variability may conflict.",
  },
  {
    id: "visibility_vs_blind",
    positive: /we (can )?see everything|full visibility|real-?time visibility/i,
    negative: /don'?t know|no visibility|can'?t see|lost track/i,
    claimA: "Visibility is described as strong.",
    claimB: "Later comments suggest limited visibility.",
    clarification:
      "This may require clarification — visibility claims and later gaps deserve a precise definition of what leaders can actually see.",
  },
  {
    id: "team_vs_solo",
    positive: /we have a (full )?team|strong team|many people/i,
    negative: /only (one|i|me)|single person|i do everything/i,
    claimA: "Team capacity is described as adequate.",
    claimB: "Critical work appears concentrated in one person.",
    clarification:
      "This may require clarification — team capacity and single-person ownership of critical paths may be inconsistent.",
  },
];

/**
 * Soft contradiction detection — never accusatory.
 */
export function evaluateContradictions(
  memory: ConversationMemory,
  latestAnswer?: string,
): PotentialContradiction[] {
  const text = [
    ...memory.knownFacts.map((f) => f.statement),
    ...memory.hypotheses.map((h) => h.statement),
    ...memory.assumptions.map((a) => a.statement),
    ...memory.painPoints.map((p) => p.description),
    latestAnswer ?? "",
  ].join("\n");

  const found: PotentialContradiction[] = [];

  for (const pair of PAIRS) {
    if (!pair.positive.test(text) || !pair.negative.test(text)) continue;

    found.push({
      id: createId("contradiction"),
      statement: pair.clarification,
      claimA: pair.claimA,
      claimB: pair.claimB,
      confidence: 0.7,
      evidence: [pair.claimA, pair.claimB],
    });
  }

  for (const existing of memory.contradictions) {
    if (found.some((f) => f.statement === existing.statement)) continue;
    if (!/may require clarification/i.test(existing.statement)) continue;
    found.push({
      id: existing.id,
      statement: existing.statement,
      claimA: existing.claimA ?? existing.evidence[0] ?? "Earlier claim",
      claimB: existing.claimB ?? existing.evidence[1] ?? "Later claim",
      confidence: existing.confidence ?? 0.65,
      evidence: existing.evidence,
    });
  }

  return found.slice(0, 8);
}
