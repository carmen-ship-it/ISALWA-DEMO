import { normalizeEmailKey, normalizeNameKey, normalizeNitKey } from './normalize-name';
import { phoneMatchKey } from './normalize-phone';
import type {
  AnalyzedImportRow,
  ImportEntityRefs,
  MatchCatalog,
  MatchCatalogParty,
  NormalizedCustomerRow,
  NormalizedImportRow,
  NormalizedStaffRow,
} from './types';
import { validateNormalizedRow } from './validate';

function contactPhoneKeys(c: MatchCatalogParty['contacts'][number]): string[] {
  const keys: string[] = [];
  const p = phoneMatchKey(c.phone);
  const w = phoneMatchKey(c.whatsapp);
  if (p) keys.push(p);
  if (w && w !== p) keys.push(w);
  return keys;
}

function partiesByCommercialName(catalog: MatchCatalog, key: string): MatchCatalogParty[] {
  return catalog.parties.filter(
    (p) => p.partyKind === 'organization' && p.status === 'active' && normalizeNameKey(p.displayName) === key,
  );
}

function partiesByPhone(catalog: MatchCatalog, phoneKey: string): MatchCatalogParty[] {
  return catalog.parties.filter(
    (p) =>
      p.status === 'active' &&
      p.contacts.some((c) => contactPhoneKeys(c).includes(phoneKey)),
  );
}

function partiesByNit(catalog: MatchCatalog, nitKey: string): MatchCatalogParty[] {
  return catalog.parties.filter((p) => p.status === 'active' && p.nitKeys.includes(nitKey));
}

function personPartiesByName(catalog: MatchCatalog, nameKey: string): MatchCatalogParty[] {
  return catalog.parties.filter(
    (p) => p.partyKind === 'person' && p.status === 'active' && normalizeNameKey(p.displayName) === nameKey,
  );
}

function personPartiesByEmail(catalog: MatchCatalog, emailKey: string): MatchCatalogParty[] {
  return catalog.parties.filter(
    (p) =>
      p.partyKind === 'person' &&
      p.status === 'active' &&
      p.contacts.some((c) => normalizeEmailKey(c.email) === emailKey),
  );
}

function classifyCustomer(
  row: NormalizedCustomerRow,
  catalog: MatchCatalog,
  batchSeen: { commercialKeys: Set<string>; phoneKeys: Set<string> },
): { outcome: AnalyzedImportRow['outcome']; refs: ImportEntityRefs; errorCode: string | null } {
  const nameHits = partiesByCommercialName(catalog, row.commercialNameKey);
  const phoneHits = row.phoneKey ? partiesByPhone(catalog, row.phoneKey) : [];
  const nitHits = row.nitKey ? partiesByNit(catalog, row.nitKey) : [];

  const intraName = batchSeen.commercialKeys.has(row.commercialNameKey);
  const intraPhone = row.phoneKey ? batchSeen.phoneKeys.has(row.phoneKey) : false;

  if (intraName || intraPhone) {
    return {
      outcome: 'POSSIBLE_DUPLICATE',
      refs: {},
      errorCode: 'INTRA_BATCH_DUPLICATE',
    };
  }

  const allHitIds = new Set<string>([
    ...nameHits.map((p) => p.partyId),
    ...phoneHits.map((p) => p.partyId),
    ...nitHits.map((p) => p.partyId),
  ]);

  if (allHitIds.size > 1) {
    return {
      outcome: 'REQUIRES_REVIEW',
      refs: {},
      errorCode: 'CONFLICTING_MATCH_EVIDENCE',
    };
  }

  if (nitHits.length === 1 && nameHits.length === 1 && nitHits[0]!.partyId !== nameHits[0]!.partyId) {
    return {
      outcome: 'REQUIRES_REVIEW',
      refs: {},
      errorCode: 'CONFLICTING_MATCH_EVIDENCE',
    };
  }

  // Exact MATCH: commercial name + phone both agree on same party (or NIT alone exact).
  if (nitHits.length === 1 && nameHits.length <= 1 && phoneHits.length <= 1) {
    const party = nitHits[0]!;
    if (
      (nameHits.length === 0 || nameHits[0]!.partyId === party.partyId) &&
      (phoneHits.length === 0 || phoneHits[0]!.partyId === party.partyId)
    ) {
      return {
        outcome: 'MATCH',
        refs: { matchedPartyId: party.partyId, createdByBatch: false },
        errorCode: null,
      };
    }
  }

  if (nameHits.length === 1 && phoneHits.length === 1 && nameHits[0]!.partyId === phoneHits[0]!.partyId) {
    return {
      outcome: 'MATCH',
      refs: { matchedPartyId: nameHits[0]!.partyId, createdByBatch: false },
      errorCode: null,
    };
  }

  if (nameHits.length === 1 && phoneHits.length === 0 && !row.phoneKey) {
    // Name-only without phone: possible duplicate, not silent MATCH.
    return {
      outcome: 'POSSIBLE_DUPLICATE',
      refs: { matchedPartyId: nameHits[0]!.partyId, createdByBatch: false },
      errorCode: 'NAME_ONLY_EVIDENCE',
    };
  }

  if (nameHits.length >= 1 || phoneHits.length >= 1 || nitHits.length >= 1) {
    return {
      outcome: 'POSSIBLE_DUPLICATE',
      refs: {
        matchedPartyId: nameHits[0]?.partyId ?? phoneHits[0]?.partyId ?? nitHits[0]?.partyId,
        createdByBatch: false,
      },
      errorCode: 'PARTIAL_MATCH_EVIDENCE',
    };
  }

  return { outcome: 'CREATE', refs: { createdByBatch: true }, errorCode: null };
}

function classifyStaff(
  row: NormalizedStaffRow,
  catalog: MatchCatalog,
  batchSeenEmails: Set<string>,
  batchSeenNames: Set<string>,
): { outcome: AnalyzedImportRow['outcome']; refs: ImportEntityRefs; errorCode: string | null } {
  // Staff never auto-creates AuthIdentity / membership — review path only.
  if (row.emailKey && batchSeenEmails.has(row.emailKey)) {
    return { outcome: 'POSSIBLE_DUPLICATE', refs: {}, errorCode: 'INTRA_BATCH_DUPLICATE' };
  }
  if (batchSeenNames.has(row.displayNameKey)) {
    return { outcome: 'POSSIBLE_DUPLICATE', refs: {}, errorCode: 'INTRA_BATCH_DUPLICATE' };
  }

  const emailHits = row.emailKey ? personPartiesByEmail(catalog, row.emailKey) : [];
  const nameHits = personPartiesByName(catalog, row.displayNameKey);

  if (emailHits.length + nameHits.length > 0) {
    const ids = new Set([...emailHits, ...nameHits].map((p) => p.partyId));
    if (ids.size > 1) {
      return { outcome: 'REQUIRES_REVIEW', refs: {}, errorCode: 'CONFLICTING_MATCH_EVIDENCE' };
    }
    return {
      outcome: 'POSSIBLE_DUPLICATE',
      refs: { matchedPartyId: [...ids][0], createdByBatch: false },
      errorCode: 'STAFF_CANDIDATE_EXISTS',
    };
  }

  return {
    outcome: 'REQUIRES_REVIEW',
    refs: {},
    errorCode: 'STAFF_PERSON_CANDIDATE',
  };
}

function toSnapshot(row: NormalizedImportRow): Record<string, unknown> {
  if (row.section === 'A') {
    return {
      section: 'A',
      rowIndex: row.rowIndex,
      hasEmail: Boolean(row.emailKey),
      hasCargo: Boolean(row.cargo),
      displayNameKey: row.displayNameKey,
    };
  }
  return {
    section: 'B',
    rowIndex: row.rowIndex,
    commercialNameKey: row.commercialNameKey,
    personNameKey: row.personNameKey,
    hasPhone: Boolean(row.phoneKey),
    hasWhatsapp: Boolean(row.whatsapp),
    hasNit: Boolean(row.nitKey),
    locationKind: row.location.kind,
    hasProvenance: Boolean(row.location.provenanceUrl),
    hasCoords: row.location.latitude !== null && row.location.longitude !== null,
  };
}

export function analyzeRows(
  normalized: NormalizedImportRow[],
  catalog: MatchCatalog,
): AnalyzedImportRow[] {
  const batchCommercial = new Set<string>();
  const batchPhones = new Set<string>();
  const batchStaffEmails = new Set<string>();
  const batchStaffNames = new Set<string>();
  const results: AnalyzedImportRow[] = [];

  for (const row of normalized) {
    const issues = validateNormalizedRow(row);
    if (issues.length > 0) {
      results.push({
        section: row.section,
        rowIndex: row.rowIndex,
        outcome: 'REJECTED',
        errorCode: issues[0]!.code,
        entityRefs: {},
        normalized: row,
        snapshot: toSnapshot(row),
      });
      continue;
    }

    if (row.section === 'A') {
      const classified = classifyStaff(row, catalog, batchStaffEmails, batchStaffNames);
      if (row.emailKey) batchStaffEmails.add(row.emailKey);
      batchStaffNames.add(row.displayNameKey);
      results.push({
        section: 'A',
        rowIndex: row.rowIndex,
        outcome: classified.outcome,
        errorCode: classified.errorCode,
        entityRefs: classified.refs,
        normalized: row,
        snapshot: toSnapshot(row),
      });
      continue;
    }

    const classified = classifyCustomer(row, catalog, {
      commercialKeys: batchCommercial,
      phoneKeys: batchPhones,
    });
    if (classified.outcome === 'CREATE') {
      batchCommercial.add(row.commercialNameKey);
      if (row.phoneKey) batchPhones.add(row.phoneKey);
    } else if (classified.outcome === 'POSSIBLE_DUPLICATE' || classified.outcome === 'REQUIRES_REVIEW') {
      // Still reserve keys so a later CREATE cannot collide silently.
      batchCommercial.add(row.commercialNameKey);
      if (row.phoneKey) batchPhones.add(row.phoneKey);
    } else if (classified.outcome === 'MATCH') {
      batchCommercial.add(row.commercialNameKey);
      if (row.phoneKey) batchPhones.add(row.phoneKey);
    }

    results.push({
      section: 'B',
      rowIndex: row.rowIndex,
      outcome: classified.outcome,
      errorCode: classified.errorCode,
      entityRefs: classified.refs,
      normalized: row,
      snapshot: toSnapshot(row),
    });
  }

  return results;
}

/** Build catalog helpers for tests. */
export function emptyCatalog(): MatchCatalog {
  return { parties: [] };
}

export { normalizeNitKey };
