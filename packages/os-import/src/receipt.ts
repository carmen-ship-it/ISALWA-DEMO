import type { ImportSection } from '@isalwa/os-contracts';
import type { AnalyzedImportRow, ImportReceipt } from './types';

export function isRealClientImportEnabled(): boolean {
  return process.env.OS_REAL_CLIENT_IMPORT_ENABLED === 'true';
}

export function buildReceipt(input: {
  importBatchId: string;
  mode: ImportReceipt['mode'];
  analyzed: AnalyzedImportRow[];
  created?: number;
  reversed?: ImportReceipt['reversed'];
}): ImportReceipt {
  const { importBatchId, mode, analyzed } = input;
  const errors: ImportReceipt['errors'] = [];

  let rowsValid = 0;
  let rowsRejected = 0;
  let wouldCreate = 0;
  let matched = 0;
  let possibleDuplicates = 0;
  let manualReview = 0;
  let withCoords = 0;
  let provenanceOnly = 0;
  let skipped = 0;
  let personCandidates = 0;

  for (const row of analyzed) {
    if (row.outcome === 'REJECTED') {
      rowsRejected += 1;
      errors.push({
        rowIndex: row.rowIndex,
        section: row.section as ImportSection,
        code: row.errorCode ?? 'REJECTED',
        message: 'Row rejected during validation',
      });
      continue;
    }
    rowsValid += 1;

    if (row.outcome === 'CREATE') wouldCreate += 1;
    if (row.outcome === 'MATCH') matched += 1;
    if (row.outcome === 'POSSIBLE_DUPLICATE') possibleDuplicates += 1;
    if (row.outcome === 'REQUIRES_REVIEW') manualReview += 1;

    if (row.section === 'A') {
      personCandidates += 1;
    }

    if (row.section === 'B' && row.normalized.section === 'B') {
      if (row.normalized.location.kind === 'with_coords') withCoords += 1;
      else if (row.normalized.location.kind === 'provenance_only') provenanceOnly += 1;
      else skipped += 1;
    }
  }

  return {
    importBatchId,
    mode,
    rowsReceived: analyzed.length,
    rowsValid,
    rowsRejected,
    wouldCreate,
    created: input.created ?? 0,
    matched,
    possibleDuplicates,
    manualReview,
    errors,
    location: { withCoords, provenanceOnly, skipped },
    staff: {
      personCandidates,
      blockedAuthCreates: 0,
    },
    gates: {
      locationContractReady: true,
      realDataImportAllowed: isRealClientImportEnabled(),
    },
    reversed: input.reversed,
  };
}
