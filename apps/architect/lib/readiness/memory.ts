/**
 * Consultant Readiness Engine — bridge into working memory.
 *
 * Imported evidence (documents today, uploads / e-mail / CRM tomorrow) has
 * to reach the interview without a second scoring path. It does so as
 * ordinary known facts under the `evidence_<topic>` keys `computeDiscoveryScore`
 * already recognises, so the Discovery Score stays the only place a number
 * is produced. Idempotent: a topic that already carries an evidence fact is
 * left alone.
 */

import { applyDiscoveryScore } from "@/lib/reasoning/confidence/score";
import { createEmptyMemory } from "@/lib/reasoning/memory/absorb";
import { createId, nowIso } from "@/lib/utils";
import type { CompanyWorkspace, ConversationMemory, KnownFact } from "@/types";
import { assessReadiness } from "./evaluate";

export function applyReadinessToMemory(
  memory: ConversationMemory,
  workspace: CompanyWorkspace,
): ConversationMemory {
  const assessment = assessReadiness(workspace);
  if (assessment.signals.length === 0) return memory;

  const existingKeys = new Set(memory.knownFacts.map((fact) => fact.key));

  const newFacts = assessment.signals.flatMap((signal) => {
    const facts: KnownFact[] = [];
    const baseKey = `evidence_${signal.dimension}`;
    const strongKey = `${baseKey}_strong`;

    const fact = (key: string): KnownFact => ({
      id: createId("fact"),
      key,
      statement: signal.reason,
      evidence: ["Conocimiento del negocio"],
      confidence: signal.coveragePercent / 100,
      dimension: signal.dimension,
      createdAt: nowIso(),
    });

    if (!existingKeys.has(baseKey)) facts.push(fact(baseKey));
    if (signal.skipRecommended && !existingKeys.has(strongKey)) {
      facts.push(fact(strongKey));
    }
    return facts;
  });

  if (newFacts.length === 0) return memory;

  return {
    ...memory,
    knownFacts: [...memory.knownFacts, ...newFacts],
  };
}

export interface UnderstandingRefresh {
  workspace: CompanyWorkspace;
  /** Published understanding before this pass. */
  previous: number;
  /** Published understanding after it. Never lower than `previous`. */
  next: number;
  /** True when new document evidence actually moved the number. */
  changed: boolean;
}

/**
 * AI Document Processing Pipeline — recompute published understanding after
 * new evidence lands.
 *
 * This adds no second scoring system. It runs the bridge above (imported
 * evidence becomes `evidence_<topic>` known facts) and then the *existing*
 * Discovery Score, which is the only place in the platform a number like
 * this is produced — the same composition `lib/resume/engine.ts` already
 * performs when an interview resumes. The pipeline just runs it when a
 * document arrives instead of waiting for the next conversation.
 *
 * Two deliberate constraints:
 *  - The number never goes down. Documents add evidence; they do not
 *    invalidate what an interview established.
 *  - `conversationMemory` is only written back when it already existed.
 *    Uploading a document must not fabricate an interview memory on a
 *    workspace that has never had one — in that case the score is computed
 *    from an ephemeral memory and only the published number is updated.
 */
export function refreshUnderstandingFromEvidence(
  workspace: CompanyWorkspace,
): UnderstandingRefresh {
  const previous = workspace.businessUnderstanding;
  const hadMemory = workspace.conversationMemory !== null;
  const baseMemory = workspace.conversationMemory ?? createEmptyMemory();

  const withEvidence = applyReadinessToMemory(baseMemory, workspace);
  const scored = applyDiscoveryScore(withEvidence);
  const next = Math.max(previous, scored.score.overall);

  const changed = next !== previous || (hadMemory && scored !== baseMemory);
  if (!changed) {
    return { workspace, previous, next: previous, changed: false };
  }

  return {
    workspace: {
      ...workspace,
      businessUnderstanding: next,
      conversationMemory: hadMemory ? scored : workspace.conversationMemory,
    },
    previous,
    next,
    changed: true,
  };
}
