/**
 * Pure domain helpers — no I/O.
 * Relationship score is explainable: weighted components 0–100.
 * Commercial timeline events live under ./events (Mission 17).
 */

export type RelationshipScoreComponents = {
  recency: number;
  frequency: number;
  monetary: number;
  debtHealth: number;
  responsiveness: number;
};

export function computeRelationshipScore(c: RelationshipScoreComponents): {
  score: number;
  components: RelationshipScoreComponents;
} {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const components = {
    recency: clamp(c.recency),
    frequency: clamp(c.frequency),
    monetary: clamp(c.monetary),
    debtHealth: clamp(c.debtHealth),
    responsiveness: clamp(c.responsiveness),
  };
  const score = Math.round(
    components.recency * 0.25 +
      components.frequency * 0.2 +
      components.monetary * 0.25 +
      components.debtHealth * 0.15 +
      components.responsiveness * 0.15,
  );
  return { score, components };
}

/** SLA remaining fraction 0..1 from due timestamp. */
export function slaRemainingFraction(nowMs: number, dueMs: number, windowMs: number): number {
  if (windowMs <= 0) return 0;
  const remaining = dueMs - nowMs;
  return Math.max(0, Math.min(1, remaining / windowMs));
}

export * from './events/index';
