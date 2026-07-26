/**
 * Unified Business Knowledge Intake — cross-source deduplication.
 *
 * "Never duplicate; accumulate evidence." Every merge helper here compares
 * incoming signals against what the workspace already has and either (a)
 * reinforces the existing record — appending source references and
 * increasing confidence — or (b) appends a genuinely new record. Nothing is
 * ever silently dropped or blindly overwritten.
 */

import { createId, nowIso } from "@/lib/utils";
import type {
  KnowledgeBusinessRule,
  KnowledgeContradictionFlag,
  Opportunity,
  PainPoint,
} from "@/types";
import type {
  IntakeBusinessRule,
  IntakeContradictionSignal,
  IntakeOpportunitySignal,
  IntakePainSignal,
} from "./contracts";
import { reinforceConfidence } from "./confidence";

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface MergeCount {
  added: number;
  reinforced: number;
}

export function mergeBusinessRules(
  existing: KnowledgeBusinessRule[],
  incoming: IntakeBusinessRule[],
  assetId: string,
): { rules: KnowledgeBusinessRule[] } & MergeCount {
  const rules = [...existing];
  let added = 0;
  let reinforced = 0;
  for (const rule of incoming) {
    const found = rules.find(
      (r) => normalize(r.statement) === normalize(rule.statement),
    );
    if (found) {
      found.sourceAssetIds = Array.from(
        new Set([...found.sourceAssetIds, assetId]),
      );
      found.confidence = reinforceConfidence(found.confidence, rule.confidence);
      reinforced += 1;
      continue;
    }
    rules.push({
      id: createId("rule"),
      statement: rule.statement,
      sourceAssetIds: [assetId],
      confidence: rule.confidence,
      createdAt: nowIso(),
    });
    added += 1;
  }
  return { rules, added, reinforced };
}

export function mergeContradictions(
  existing: KnowledgeContradictionFlag[],
  incoming: IntakeContradictionSignal[],
  assetId: string,
): { contradictions: KnowledgeContradictionFlag[] } & MergeCount {
  const contradictions = [...existing];
  let added = 0;
  let reinforced = 0;
  for (const flag of incoming) {
    const found = contradictions.find(
      (c) => normalize(c.statement) === normalize(flag.statement),
    );
    if (found) {
      found.sourceAssetIds = Array.from(
        new Set([...found.sourceAssetIds, assetId]),
      );
      found.confidence = reinforceConfidence(found.confidence, flag.confidence);
      reinforced += 1;
      continue;
    }
    contradictions.push({
      id: createId("contradiction"),
      statement: flag.statement,
      sourceAssetIds: [assetId],
      confidence: flag.confidence,
      createdAt: nowIso(),
    });
    added += 1;
  }
  return { contradictions, added, reinforced };
}

/** Pain signals feed the existing PainPoint engine — never a parallel list. */
export function mergePainSignalsIntoWorkspace(
  existing: PainPoint[],
  incoming: IntakePainSignal[],
): { painPoints: PainPoint[] } & MergeCount {
  const painPoints = [...existing];
  let added = 0;
  let reinforced = 0;
  for (const signal of incoming) {
    const found = painPoints.find(
      (p) => normalize(p.title) === normalize(signal.title),
    );
    if (found) {
      found.evidence = Array.from(
        new Set([...found.evidence, signal.description]),
      );
      reinforced += 1;
      continue;
    }
    painPoints.push({
      id: createId("pain"),
      title: signal.title,
      description: signal.description,
      category: "manual_work",
      severity: "notable",
      evidence: [signal.description],
    });
    added += 1;
  }
  return { painPoints, added, reinforced };
}

/** Opportunity signals feed the existing Opportunity engine — never a parallel list. */
export function mergeOpportunitySignalsIntoWorkspace(
  existing: Opportunity[],
  incoming: IntakeOpportunitySignal[],
): { opportunities: Opportunity[] } & MergeCount {
  const opportunities = [...existing];
  let added = 0;
  let reinforced = 0;
  for (const signal of incoming) {
    const found = opportunities.find(
      (o) => normalize(o.title) === normalize(signal.title),
    );
    if (found) {
      found.evidence = Array.from(
        new Set([...found.evidence, signal.description]),
      );
      reinforced += 1;
      continue;
    }
    opportunities.push({
      id: createId("opportunity"),
      title: signal.title,
      impact: "medium",
      description: signal.description,
      evidence: [signal.description],
      createdAt: nowIso(),
    });
    added += 1;
  }
  return { opportunities, added, reinforced };
}

/** Unknowns/gaps feed the existing `openQuestions` list — deduped, never replacing prior questions. */
export function mergeUnknownsIntoOpenQuestions(
  existing: string[],
  incomingLabels: string[],
): { openQuestions: string[]; added: number } {
  const seen = new Set(existing.map(normalize));
  const openQuestions = [...existing];
  let added = 0;
  for (const label of incomingLabels) {
    const key = normalize(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    openQuestions.push(label);
    added += 1;
  }
  return { openQuestions, added };
}
