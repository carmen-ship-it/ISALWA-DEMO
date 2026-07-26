/**
 * Unified Business Knowledge Intake — confidence & contradiction heuristics.
 *
 * Deterministic only. No AI/NLP. Confidence increases when independent
 * sources confirm the same fact, with diminishing returns and a hard cap —
 * intake never claims certainty. Contradiction detection is a narrow,
 * transparent numeric-mismatch heuristic; anything else stays "unknown"
 * rather than guessed.
 */

const CONFIDENCE_CAP = 0.97;

/**
 * Reinforce confidence when a second source confirms the same fact/entity.
 * Diminishing returns — never overwrites, only reinforces.
 */
export function reinforceConfidence(prior: number, incoming: number): number {
  const boosted = prior + incoming * (1 - prior) * 0.5;
  return Math.min(CONFIDENCE_CAP, Math.max(prior, boosted));
}

function firstNumber(text: string): number | null {
  const match = /-?\d[\d.,]*/.exec(text);
  if (!match) return null;
  const cleaned = match[0].replace(/,/g, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

function normalizedWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );
}

function overlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) {
    if (b.has(word)) shared += 1;
  }
  return shared / Math.min(a.size, b.size);
}

export interface ContradictionMatch {
  existingStatement: string;
  incomingStatement: string;
  reason: string;
}

/**
 * Narrow, honest heuristic: two statements about clearly the same subject
 * (high word overlap) that cite meaningfully different numbers. This is the
 * only contradiction signal intake raises on its own — everything else stays
 * a soft "unknown" rather than a guess.
 */
export function detectNumericContradiction(
  existingStatement: string,
  incomingStatement: string,
): ContradictionMatch | null {
  const existingWords = normalizedWords(existingStatement);
  const incomingWords = normalizedWords(incomingStatement);
  if (overlapRatio(existingWords, incomingWords) < 0.4) return null;

  const existingNumber = firstNumber(existingStatement);
  const incomingNumber = firstNumber(incomingStatement);
  if (existingNumber === null || incomingNumber === null) return null;
  if (existingNumber === 0 && incomingNumber === 0) return null;

  const larger = Math.max(Math.abs(existingNumber), Math.abs(incomingNumber));
  const diff = Math.abs(existingNumber - incomingNumber);
  if (larger === 0 || diff / larger < 0.25) return null;

  return {
    existingStatement,
    incomingStatement,
    reason: `Se mencionan cifras distintas para lo mismo: "${existingStatement}" vs. "${incomingStatement}".`,
  };
}

/** Scan a new statement against prior statements — first match wins, stays soft. */
export function findContradiction(
  priorStatements: string[],
  incomingStatement: string,
): ContradictionMatch | null {
  for (const prior of priorStatements) {
    const match = detectNumericContradiction(prior, incomingStatement);
    if (match) return match;
  }
  return null;
}
