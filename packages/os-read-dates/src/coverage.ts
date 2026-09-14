/**
 * Source coverage for a stored commercial date fact.
 * Missing row is NO_FACT, never false and never zero risk.
 * A query that cannot be authorized is UNPROVEN, never a fake false flag.
 */
export const SOURCE_COVERAGE = ['AVAILABLE', 'NO_FACT', 'UNPROVEN', 'ERROR'] as const;

export type SourceCoverage = (typeof SOURCE_COVERAGE)[number];

export const DATE_READ_DENIALS = ['PERMISSION_DENIED', 'AUTH_REQUIRED'] as const;

export type DateReadDenial = (typeof DATE_READ_DENIALS)[number];

export type CoveredFact<T> =
  | { coverage: 'AVAILABLE'; fact: T }
  | { coverage: 'NO_FACT'; fact: null }
  | { coverage: 'UNPROVEN'; fact: null; denial: DateReadDenial }
  | { coverage: 'ERROR'; fact: null };

export function available<T>(fact: T): CoveredFact<T> {
  return { coverage: 'AVAILABLE', fact };
}

export function noFact<T>(): CoveredFact<T> {
  return { coverage: 'NO_FACT', fact: null };
}

export function unproven<T>(denial: DateReadDenial): CoveredFact<T> {
  return { coverage: 'UNPROVEN', fact: null, denial };
}

export function readError<T>(): CoveredFact<T> {
  return { coverage: 'ERROR', fact: null };
}

export function isNoFact(value: CoveredFact<unknown>): value is { coverage: 'NO_FACT'; fact: null } {
  return value.coverage === 'NO_FACT' && value.fact === null;
}
