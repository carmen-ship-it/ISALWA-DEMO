import type {
  BusinessHealthModel,
  ConsultingConfidence,
  ConsultingOpportunity,
  ConsultingRisk,
  MaturityModel,
  PotentialContradiction,
} from "@/types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Meta-confidence across consulting models.
 */
export function evaluateConsultingConfidence(input: {
  maturity: MaturityModel;
  health: BusinessHealthModel;
  risks: ConsultingRisk[];
  opportunities: ConsultingOpportunity[];
  contradictions: PotentialContradiction[];
  evidenceCount: number;
}): ConsultingConfidence {
  const evidenceDensity = clamp(input.evidenceCount * 6);
  const riskConfidence =
    input.risks.length === 0
      ? 35
      : clamp(
          (input.risks.reduce((sum, r) => sum + r.confidence, 0) /
            input.risks.length) *
            100,
        );
  const opportunityConfidence =
    input.opportunities.length === 0
      ? 30
      : clamp(
          (input.opportunities.reduce((sum, o) => sum + o.confidence, 0) /
            input.opportunities.length) *
            100,
        );

  const notes: string[] = [];
  if (input.evidenceCount < 3) {
    notes.push("La densidad de evidencia aún es baja — los puntajes se moverán con cada respuesta.");
  }
  if (input.contradictions.length > 0) {
    notes.push(
      "Se señalan posibles contradicciones para aclarar, no para juzgar.",
    );
  }
  if (input.risks.some((r) => r.severity === "critical")) {
    notes.push("Hay riesgos operativos críticos presentes en el modelo actual.");
  }

  const overall = clamp(
    input.maturity.confidence * 0.35 +
      input.health.confidence * 0.25 +
      riskConfidence * 0.2 +
      opportunityConfidence * 0.1 +
      evidenceDensity * 0.1,
  );

  return {
    overall,
    maturityConfidence: input.maturity.confidence,
    riskConfidence,
    opportunityConfidence,
    evidenceDensity,
    notes,
  };
}
