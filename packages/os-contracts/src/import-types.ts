import type { ContactNumberInvalidReason, ContactPhoneCountry } from './party-commands';

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

/** Phone values read from a customer row. Invalid values stay flagged until corrected or explicitly omitted. */
export const IMPORT_PHONE_VALUE_STATUSES = ['accepted', 'invalid', 'corrected', 'omitted'] as const;
export type ImportPhoneValueStatus = (typeof IMPORT_PHONE_VALUE_STATUSES)[number];

export const IMPORT_PHONE_DECISIONS = ['correct', 'omit'] as const;
export type ImportPhoneDecision = (typeof IMPORT_PHONE_DECISIONS)[number];

export type ImportPhoneField = 'celular' | 'telefono';

export type ImportPhoneResolution = {
  decision: ImportPhoneDecision;
  byMemberId: string;
  at: string;
  reason: string;
  /** Reviewer's corrected text (restricted, like the original). */
  correctedOriginal?: string;
};

/** One value read from a phone cell. Restricted: the original stays in the import record only. */
export type ImportPhoneValue = {
  valueId: string;
  field: ImportPhoneField;
  tokenIndex: number;
  original: string;
  normalized: string | null;
  status: ImportPhoneValueStatus;
  /** Shared-rule refusal reason of the original value; kept after a resolution. */
  reason: ContactNumberInvalidReason | null;
  adjustments: string[];
  resolution?: ImportPhoneResolution;
};

export type ImportPhoneProposedAction =
  | 'import'
  | 'keep_in_import_record_only'
  | 'correct_or_omit'
  | 'import_corrected'
  | 'import_without_number';

export type ImportReceipt = {
  importBatchId: string;
  mode: 'dry_run' | 'validate' | 'execute' | 'rollback' | 'receipt';
  rowsReceived: number;
  rowsValid: number;
  rowsRejected: number;
  wouldCreate: number;
  created: number;
  matched: number;
  possibleDuplicates: number;
  manualReview: number;
  errors: Array<{ rowIndex: number; section: ImportSection; code: string; message: string }>;
  location: {
    withCoords: number;
    provenanceOnly: number;
    skipped: number;
  };
  phoneReview: {
    country: ContactPhoneCountry;
    countrySource: 'default' | 'explicit';
    accepted: number;
    corrected: number;
    omitted: number;
    invalid: number;
    extraNotImported: number;
    rowsNeedingCorrection: number;
    code: 'EXTRA_PHONE_NOT_IMPORTED' | null;
    correctionCode: 'PHONE_CORRECTION_REQUIRED' | null;
    /** Every value that is not a plain stored number. Masked; originals only through ListImportPhoneReview. */
    items: Array<{
      rowIndex: number;
      valueId: string;
      field: ImportPhoneField;
      maskedOriginal: string;
      status: ImportPhoneValueStatus;
      reason: ContactNumberInvalidReason | null;
      proposedAction: ImportPhoneProposedAction;
    }>;
  };
  staff: {
    personCandidates: number;
    blockedAuthCreates: number;
  };
  gates: {
    locationContractReady: boolean;
    realDataImportAllowed: boolean;
  };
  reversed?: {
    parties: number;
    contacts: number;
    locations: number;
  };
};

/** `GetImportBatchReceipt` data: the stored receipt plus the batch status. */
export type ImportReceiptView = ImportReceipt & { status: ImportBatchStatus };

/** One customer row in `ListImportPhoneReview`. Carries original values: restricted to import reviewers. */
export type ImportPhoneReviewRow = {
  rowIndex: number;
  outcome: ImportRowOutcome;
  /** Send as `expectedVersion` to `ResolveImportPhoneValue`. */
  version: number;
  needsCorrection: boolean;
  celularOriginal: string | null;
  telefonoOriginal: string | null;
  values: Array<ImportPhoneValue & { proposedAction: ImportPhoneProposedAction }>;
};

/** `ListImportPhoneReview` data. */
export type ImportPhoneReviewList = {
  importBatchId: string;
  status: ImportBatchStatus;
  country: ContactPhoneCountry;
  countrySource: 'default' | 'explicit';
  summary: ImportReceipt['phoneReview'];
  rows: ImportPhoneReviewRow[];
};

/** `ResolveImportPhoneValue` data. */
export type ImportPhoneValueResolution = {
  importBatchId: string;
  rowIndex: number;
  rowVersion: number;
  outcome: ImportRowOutcome;
  errorCode: string | null;
  item: ImportReceipt['phoneReview']['items'][number] | null;
  phoneReview: Omit<ImportReceipt['phoneReview'], 'items'>;
};
