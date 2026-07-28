/**
 * Industry playbook bias — the question-ranking seam (Mission F).
 *
 * Mirrors `lib/consulting/questions/consequence-engine.ts`'s
 * `applyConsequenceBias`: read-only re-scoring of a candidate that already
 * exists in the pool. This never adds a fact, never invents evidence, and
 * never creates a second ranking engine — `scoreQuestion` calls it as one
 * more bias step, same as the consequence bias it sits next to.
 */

import type { ConversationMemory } from "@/types";
import type { LibraryQuestion } from "@/lib/consulting/questions/question-library";
import { industryDimensionPattern, industryDimensionWeight } from "./playbooks";

/** Cap so an industry pattern nudges ranking, never dominates real evidence signals. */
const MAX_INDUSTRY_BOOST = 4;

/**
 * Nudge a candidate toward the dimensions this client's industry usually
 * needs most — additive priority only, capped, and only for the intents
 * whose own reason text has room for a short industry note (consequence and
 * contradiction candidates already carry a specific, evidence-grounded
 * reason and are left untouched).
 */
export function applyIndustryPlaybookBias(
  candidate: LibraryQuestion,
  memory: ConversationMemory,
): LibraryQuestion {
  const industry = memory.summary.industry;
  const weight = Math.min(MAX_INDUSTRY_BOOST, industryDimensionWeight(industry, candidate.dimension));
  if (weight <= 0) return candidate;

  const boosted: LibraryQuestion = {
    ...candidate,
    priority: Math.min(100, candidate.priority + weight),
  };

  if (candidate.intent === "consequence" || candidate.intent === "contradiction") {
    return boosted;
  }

  const pattern = industryDimensionPattern(industry, candidate.dimension);
  if (!pattern) return boosted;

  return {
    ...boosted,
    reason: `${candidate.reason} Patrón de industria: ${pattern}`,
  };
}
