/**
 * Executive Consulting Intelligence — Mission 3.
 * Single entry point that assembles the whole "Perspectivas ejecutivas"
 * area from existing engines. Pure derivation, no persistence, no mutation.
 * See EXECUTIVE_CONSULTING_INTELLIGENCE.md for the full source map.
 */

import { nowIso } from "@/lib/utils";
import type { CompanyWorkspace } from "@/types";
import { deriveBusinessDna } from "./business-dna";
import { deriveBusinessBlindSpots } from "./blind-spots";
import { deriveNextConversations } from "./who-next";
import { deriveSurprises } from "./surprises";
import { deriveInstitutionalMemory } from "./institutional-memory";
import { deriveBusinessEvolution } from "./business-evolution";
import { deriveFutureReadiness } from "./future-readiness";
import { deriveKnowledgeConcentration } from "./knowledge-concentration";
import { deriveLearnedTimeline } from "./intelligence-timeline";
import { hasMinimumEvidence } from "./shared";
import type { ExecutiveInsights } from "./types";

export function deriveExecutiveInsights(workspace: CompanyWorkspace): ExecutiveInsights {
  const businessDna = deriveBusinessDna(workspace);
  const blindSpots = deriveBusinessBlindSpots(workspace);
  const nextConversations = deriveNextConversations(workspace);
  const surprises = deriveSurprises(workspace);
  const institutionalMemory = deriveInstitutionalMemory(workspace);
  const businessEvolution = deriveBusinessEvolution(workspace);
  const futureReadiness = deriveFutureReadiness(workspace);
  const knowledgeConcentration = deriveKnowledgeConcentration(workspace);
  const learnedTimeline = deriveLearnedTimeline(workspace);

  return {
    generatedAt: nowIso(),
    businessDna,
    blindSpots,
    nextConversations,
    surprises,
    institutionalMemory,
    businessEvolution,
    futureReadiness,
    knowledgeConcentration,
    learnedTimeline,
    isEarlyStage: !hasMinimumEvidence(workspace),
  };
}

export type {
  ExecutiveInsights,
  BusinessDnaTrait,
  BusinessDnaTraitId,
  BusinessBlindSpot,
  NextConversationRecommendation,
  SurprisingObservation,
  InstitutionalMemoryEntry,
  InstitutionalMemoryStep,
  BusinessEvolutionSummary,
  BusinessEvolutionMoment,
  FutureReadinessPrediction,
  KnowledgeConcentrationSummary,
  KnowledgeConcentrationNode,
  LearnedTimelineEntry,
  InsightEvidence,
} from "./types";
