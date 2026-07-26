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
    claimA: "La documentación se describe como completa.",
    claimB: "La documentación de procesos parece faltante o incompleta.",
    clarification:
      "Esto podría requerir aclaración — la completitud de la documentación y la disponibilidad de procedimientos parecen inconsistentes.",
  },
  {
    id: "system_vs_excel",
    positive: /we (have|use) (a |an )?(erp|crm|system)|everything is in the system/i,
    negative: /excel everywhere|live[s]? in excel|mostly (in )?spreadsheets/i,
    claimA: "Se describe un sistema formal como la fuente de verdad.",
    claimB: "El trabajo del día a día todavía parece liderado por hojas de cálculo.",
    clarification:
      "Esto podría requerir aclaración — las afirmaciones sobre el sistema de registro y la dependencia de hojas de cálculo podrían no coincidir.",
  },
  {
    id: "process_vs_ad_hoc",
    positive: /we (have|follow) (a )?process|standardized|standard process/i,
    negative: /ad.?hoc|case by case|depends who|no standard/i,
    claimA: "El trabajo se describe como guiado por procesos.",
    claimB: "La ejecución parece improvisada o dependiente de personas.",
    clarification:
      "Esto podría requerir aclaración — la disciplina de proceso declarada y la variabilidad diaria podrían entrar en conflicto.",
  },
  {
    id: "visibility_vs_blind",
    positive: /we (can )?see everything|full visibility|real-?time visibility/i,
    negative: /don'?t know|no visibility|can'?t see|lost track/i,
    claimA: "La visibilidad se describe como sólida.",
    claimB: "Comentarios posteriores sugieren visibilidad limitada.",
    clarification:
      "Esto podría requerir aclaración — las afirmaciones sobre visibilidad y las brechas posteriores merecen una definición precisa de lo que el liderazgo realmente puede ver.",
  },
  {
    id: "team_vs_solo",
    positive: /we have a (full )?team|strong team|many people/i,
    negative: /only (one|i|me)|single person|i do everything/i,
    claimA: "La capacidad del equipo se describe como adecuada.",
    claimB: "El trabajo crítico parece concentrado en una sola persona.",
    clarification:
      "Esto podría requerir aclaración — la capacidad del equipo y la propiedad unipersonal de las rutas críticas podrían ser inconsistentes.",
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
    if (
      !/may require clarification|podría requerir aclaración/i.test(
        existing.statement,
      )
    )
      continue;
    found.push({
      id: existing.id,
      statement: existing.statement,
      claimA: existing.claimA ?? existing.evidence[0] ?? "Afirmación anterior",
      claimB: existing.claimB ?? existing.evidence[1] ?? "Afirmación posterior",
      confidence: existing.confidence ?? 0.65,
      evidence: existing.evidence,
    });
  }

  return found.slice(0, 8);
}
