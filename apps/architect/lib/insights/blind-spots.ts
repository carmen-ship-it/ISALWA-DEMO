/**
 * 2. Business Blind Spots — what the company likely doesn't realize about
 * itself. Distinct from risks/recommendations: these are framed as
 * *awareness gaps*, not action items. Derived from contradictions, patterns,
 * and evidence density asymmetries already computed by the Consulting
 * Engine (`lib/consulting`) — never a new detector.
 */

import type { CompanyWorkspace } from "@/types";
import { consultingOf, evidence, realDimensionEvidence } from "./shared";
import type { BusinessBlindSpot, InsightEvidence } from "./types";

export function deriveBusinessBlindSpots(
  workspace: CompanyWorkspace,
): BusinessBlindSpot[] {
  const consulting = consultingOf(workspace);
  if (!consulting) return [];

  const spots: BusinessBlindSpot[] = [];

  for (const contradiction of consulting.contradictions.slice(0, 3)) {
    spots.push({
      id: contradiction.id,
      title: "Dos versiones de la misma realidad",
      observation: contradiction.statement,
      whyItMatters:
        "Cuando dos relatos internos no coinciden, suele ser porque nadie los ha puesto uno junto al otro — no porque alguien esté equivocado.",
      evidence: contradiction.evidence
        .slice(0, 3)
        .map((quote) => evidence("contradiction", contradiction.id, "Contradicción detectada", quote)),
    });
  }

  for (const pattern of consulting.patterns.slice(0, 3)) {
    spots.push({
      id: pattern.id,
      title: pattern.label,
      observation: pattern.description,
      whyItMatters:
        "Este patrón suele ser invisible desde adentro porque se volvió parte de la rutina diaria — nadie lo cuestiona ya.",
      evidence: pattern.evidence.map((quote) =>
        evidence("pattern", pattern.id, pattern.label, quote),
      ),
    });
  }

  // Asymmetry blind spot: a dimension with strong health/maturity evidence but
  // zero related risks — the business may be over-confident precisely where
  // it has stopped questioning itself.
  const strongDimension = consulting.maturity.dimensions
    .filter((d) => realDimensionEvidence(d.evidence).length >= 2 && d.score >= 70)
    .sort((a, b) => b.score - a.score)[0];
  const weakDimension = consulting.maturity.dimensions
    .filter((d) => realDimensionEvidence(d.evidence).length === 0)
    .sort((a, b) => a.confidence - b.confidence)[0];

  if (strongDimension && weakDimension && strongDimension.id !== weakDimension.id) {
    const strongEvidence: InsightEvidence[] = realDimensionEvidence(strongDimension.evidence)
      .slice(0, 2)
      .map((quote) => evidence("known_fact", strongDimension.id, strongDimension.label, quote));
    spots.push({
      id: `asymmetry_${strongDimension.id}_${weakDimension.id}`,
      title: `Confianza desigual entre áreas`,
      observation: `Hay evidencia sólida sobre "${strongDimension.label.toLowerCase()}", pero prácticamente nada sobre "${weakDimension.label.toLowerCase()}" — probablemente porque nunca se ha discutido con la misma atención.`,
      whyItMatters:
        "La atención desigual entre áreas puede esconder un problema que aún no ha sido nombrado, simplemente porque nadie ha preguntado.",
      evidence: strongEvidence,
    });
  }

  return spots.slice(0, 5);
}
