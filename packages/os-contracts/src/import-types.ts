/** Client XLS import batch statuses. */
export const IMPORT_BATCH_STATUSES = [
  'dry_run',
  'validated',
  'imported',
  'rolled_back',
  'failed',
] as const;
export type ImportBatchStatus = (typeof IMPORT_BATCH_STATUSES)[number];

/** Per-row import outcomes — no silent merge. */
export const IMPORT_ROW_OUTCOMES = [
  'CREATE',
  'MATCH',
  'POSSIBLE_DUPLICATE',
  'REQUIRES_REVIEW',
  'REJECTED',
] as const;
export type ImportRowOutcome = (typeof IMPORT_ROW_OUTCOMES)[number];

export const IMPORT_SECTIONS = ['A', 'B'] as const;
export type ImportSection = (typeof IMPORT_SECTIONS)[number];

export const IMPORT_SOURCE_KINDS = ['xls_datos_clientes'] as const;
export type ImportSourceKind = (typeof IMPORT_SOURCE_KINDS)[number];
