import type {
  ContactPhoneCountry,
  ImportBatchStatus,
  ImportPhoneValue,
  ImportReceipt,
  ImportRowOutcome,
  ImportSection,
  ImportSourceKind,
} from '@isalwa/os-contracts';

/** Wire shapes live in os-contracts so the web client shares them; re-exported for existing imports. */
export type {
  ImportPhoneField,
  ImportPhoneProposedAction,
  ImportPhoneResolution,
  ImportPhoneValue,
  ImportReceipt,
} from '@isalwa/os-contracts';

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
