import { nowIso } from "@/lib/utils";
import type {
  BusinessProfile,
  ConsultingIntelligence,
  ConversationMemory,
} from "@/types";
import { evaluateContradictions } from "./contradictions";
import { evaluateConsultingConfidence } from "./confidence";
import { emptyHealth, evaluateHealth } from "./health";
import { emptyMaturity, evaluateMaturity } from "./maturity";
import { evaluateOpportunities } from "./opportunities";
import { evaluatePatterns } from "./patterns";
import { evaluateRecommendations } from "./recommendations";
import { evaluateRisks } from "./risk";
import { syncConsultingWhiteboard } from "./whiteboard";

export function emptyConsultingIntelligence(): ConsultingIntelligence {
  return {
    maturity: emptyMaturity(),
    health: emptyHealth(),
    risks: [],
    contradictions: [],
    opportunities: [],
    patterns: [],
    recommendations: [],
    confidence: {
      overall: 0,
      maturityConfidence: 0,
      riskConfidence: 0,
      opportunityConfidence: 0,
      evidenceDensity: 0,
      notes: ["La evaluación consultiva aún no ha comenzado."],
    },
    updatedAt: nowIso(),
  };
}

/**
 * Run all deterministic consulting engines after memory absorption.
 * No LLM. Extends ConversationMemory in place via return value.
 */
export function evaluateConsultingIntelligence(
  memory: ConversationMemory,
  business: BusinessProfile,
  latestAnswer?: string,
): ConversationMemory {
  const maturity = evaluateMaturity(memory, business);
  const risks = evaluateRisks(memory, business);
  const contradictions = evaluateContradictions(memory, latestAnswer);
  const opportunities = evaluateOpportunities(memory, business);
  const patterns = evaluatePatterns(memory, business);
  const recommendations = evaluateRecommendations(risks, opportunities);
  const health = evaluateHealth(memory, maturity, risks);
  const confidence = evaluateConsultingConfidence({
    maturity,
    health,
    risks,
    opportunities,
    contradictions,
    evidenceCount:
      memory.knownFacts.length +
      memory.painPoints.length +
      business.signals.length,
  });

  const consulting: ConsultingIntelligence = {
    maturity,
    health,
    risks,
    contradictions,
    opportunities,
    patterns,
    recommendations,
    confidence,
    updatedAt: nowIso(),
  };

  const softContradictions = contradictions.map((c) => ({
    id: c.id,
    statement: c.statement,
    evidence: c.evidence,
    confidence: c.confidence,
    claimA: c.claimA,
    claimB: c.claimB,
  }));

  const nextMemory: ConversationMemory = {
    ...memory,
    contradictions: softContradictions,
    consulting,
  };

  return {
    ...nextMemory,
    whiteboard: syncConsultingWhiteboard(
      memory.whiteboard,
      nextMemory,
      consulting,
    ),
  };
}
