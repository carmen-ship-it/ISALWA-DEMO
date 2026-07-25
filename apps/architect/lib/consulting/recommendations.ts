import { createId } from "@/lib/utils";
import type {
  ConsultingOpportunity,
  ConsultingRecommendation,
  ConsultingRisk,
} from "@/types";

/**
 * Deterministic recommendation synthesis from risks + opportunities.
 */
export function evaluateRecommendations(
  risks: ConsultingRisk[],
  opportunities: ConsultingOpportunity[],
): ConsultingRecommendation[] {
  const recs: ConsultingRecommendation[] = [];

  for (const risk of risks.slice(0, 5)) {
    recs.push({
      id: createId("crec"),
      title: risk.recommendedMitigation,
      rationale: `${risk.title}: ${risk.businessImpact}`,
      priority:
        risk.severity === "critical" || risk.severity === "high"
          ? "now"
          : "next",
      relatedRiskIds: [risk.id],
      relatedOpportunityIds: [],
      evidence: risk.evidence,
    });
  }

  for (const opportunity of opportunities.slice(0, 4)) {
    if (recs.some((r) => r.title === opportunity.title)) continue;
    recs.push({
      id: createId("crec"),
      title: opportunity.title,
      rationale: `${opportunity.estimatedImpact} (${opportunity.horizon}).`,
      priority:
        opportunity.horizon === "Quick Wins"
          ? "now"
          : opportunity.horizon === "strategic"
            ? "later"
            : "next",
      relatedRiskIds: [],
      relatedOpportunityIds: [opportunity.id],
      evidence: opportunity.evidence,
    });
  }

  return recs.slice(0, 8);
}
