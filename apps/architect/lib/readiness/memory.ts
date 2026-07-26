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
