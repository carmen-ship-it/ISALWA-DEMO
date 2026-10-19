import type {
  ContactNumberInvalidReason,
  ContactPhoneCountry,
  ImportBatchStatus,
  ImportPhoneDecision,
  ImportPhoneValueStatus,
  ImportRowOutcome,
  ImportSection,
  ImportSourceKind,
} from '@isalwa/os-contracts';

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

/** Phone provenance of a customer row. */
export type ImportPhoneInput = {
  country: ContactPhoneCountry;
  countrySource: 'default' | 'explicit';
  celularOriginal: string | null;
  telefonoOriginal: string | null;
  values: ImportPhoneValue[];
  /** Increments with every reviewer decision on this row. */
  version: number;
};

export type ImportPhoneProposedAction =
  | 'import'
  | 'keep_in_import_record_only'
  | 'correct_or_omit'
  | 'import_corrected'
  | 'import_without_number';

export type ImportEntityRefs = {
  partyId?: string;
  contactId?: string;
  locationId?: string;
  commercialAccountId?: string;
  matchedPartyId?: string;
  /** True when this batch created the party (eligible for rollback). */
  createdByBatch?: boolean;
};

export type LocationAnalysis = {
  kind: 'with_coords' | 'provenance_only' | 'skipped';
  label: string;
  latitude: number | null;
  longitude: number | null;
  /** Present in memory only — never written into error messages. */
  provenanceUrl: string | null;
};

export type NormalizedStaffRow = {
  section: 'A';
  rowIndex: number;
  givenName: string;
  familyName: string;
  displayNameKey: string;
  emailKey: string | null;
  cargo: string | null;
};

export type NormalizedCustomerRow = {
  section: 'B';
  rowIndex: number;
  commercialName: string;
  commercialNameKey: string;
  givenName: string;
  familyName: string;
  personNameKey: string;
  phone: string | null;
  whatsapp: string | null;
  phoneKey: string | null;
  /** Primary plus any extra valid numbers, for exact match only. */
  phoneKeys: string[];
  /** Valid numbers that Contact.phone / Contact.whatsapp cannot both store. */
  extraPhoneNotImported: number;
  phoneInput: ImportPhoneInput;
  nitKey: string | null;
  location: LocationAnalysis;
};

export type NormalizedImportRow = NormalizedStaffRow | NormalizedCustomerRow;

export type AnalyzedImportRow = {
  section: ImportSection;
  rowIndex: number;
  outcome: ImportRowOutcome;
  errorCode: string | null;
  entityRefs: ImportEntityRefs;
  normalized: NormalizedImportRow;
  /** Redacted snapshot safe for persistence (no raw GPS/phone/email strings as free text in errors). */
  snapshot: Record<string, unknown>;
};

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

export type ImportBatchRecord = {
  id: string;
  organizationId: string;
  sourceKind: ImportSourceKind;
  sourceFingerprint: string;
  status: ImportBatchStatus;
  createdByMemberId: string;
  createdAt: Date;
  completedAt: Date | null;
  receiptJson: ImportReceipt;
  idempotencyKey: string;
  reversedAt: Date | null;
  reversedEntityRefs: Record<string, unknown> | null;
};

export type ImportRowRecord = {
  id: string;
  importBatchId: string;
  organizationId: string;
  section: ImportSection;
  rowIndex: number;
  outcome: ImportRowOutcome;
  entityRefsJson: ImportEntityRefs;
  errorCode: string | null;
  normalizedSnapshotJson: Record<string, unknown>;
};

export type MatchCatalogParty = {
  partyId: string;
  partyKind: 'organization' | 'person';
  displayName: string;
  status: string;
  nitKeys: string[];
  contacts: Array<{
    contactId: string;
    givenName: string;
    familyName: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
  }>;
};

export type MatchCatalog = {
  parties: MatchCatalogParty[];
};
