/**
 * Source states stay separate. UNPROVEN is not an empty result.
 * An authorized query that stores nothing is AVAILABLE with count 0.
 * A missing id, including a foreign-tenant id, is NO_FACT.
 */
export const SOURCE_STATES = ['AVAILABLE', 'NO_FACT', 'UNPROVEN', 'ERROR'] as const;

export type SourceState = (typeof SOURCE_STATES)[number];

export type AvailableRead<T> = {
  sourceState: 'AVAILABLE';
  code: null;
  count: number;
  rows: T[];
};

export type NoFactRead = {
  sourceState: 'NO_FACT';
  code: null;
};

export type UnprovenRead = {
  sourceState: 'UNPROVEN';
  code: string;
};

export type ErrorRead = {
  sourceState: 'ERROR';
  code: string;
};

export type ReadResult<T> = AvailableRead<T> | NoFactRead | UnprovenRead | ErrorRead;

export function available<T>(rows: T[]): AvailableRead<T> {
  return { sourceState: 'AVAILABLE', code: null, count: rows.length, rows };
}

export function noFact(): NoFactRead {
  return { sourceState: 'NO_FACT', code: null };
}

/** No count and no rows. Callers must not treat this as zero. */
export function unproven(code: string): UnprovenRead {
  return { sourceState: 'UNPROVEN', code };
}

/** A denial or a store failure is not an empty authorized result. */
export function errorRead(code: string): ErrorRead {
  return { sourceState: 'ERROR', code };
}
