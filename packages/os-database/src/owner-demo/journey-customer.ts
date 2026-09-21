/**
 * Pure journey-customer fixture spec — no I/O.
 * Demo identity uses the existing `DEMO ` prefix only.
 */
import {
  OWNER_DEMO_PREFIX,
  OWNER_DEMO_REAL_SEVEN,
  OWNER_DEMO_SYNTH_ORG,
  assertNotProtectedRealSevenName,
  assertOwnerDemoNotRealOrg,
  assertOwnerDemoSynthOrg,
  isOwnerDemoDisplayName,
  normalizePartyNameForCompare,
} from './guards';

/** Staging identity — same values as staging-wave2-role-fixtures-guards. */
const STAGING_DATABASE_NAME = 'isalwa_os_staging';
const STAGING_DATABASE_HOST_MARKER = 'dpg-dajd3kh5efls738falcg-a';

export const JOURNEY_CUSTOMER_OWNER_EMAIL = 'w2.asesor@isalwa.demo' as const;
export const JOURNEY_CUSTOMER_PARTY_ACTOR_EMAILS = [
  'w2.fixture-seed@isalwa.demo',
  'w2.owner@isalwa.demo',
] as const;

export const JOURNEY_CUSTOMER = {
  displayName: `${OWNER_DEMO_PREFIX}TALLER SAN LORENZO`,
  legalName: `${OWNER_DEMO_PREFIX}TALLER SAN LORENZO`,
  tradeName: `${OWNER_DEMO_PREFIX}TALLER SAN LORENZO`,
  relationship: 'customer' as const,
  relationshipLabel: 'cliente' as const,
  status: 'active' as const,
  statusLabel: 'Activo' as const,
  ownerEmail: JOURNEY_CUSTOMER_OWNER_EMAIL,
  contact: { givenName: 'Rosa', familyName: 'Mercado', phone: '+59170011901' },
  location: { label: 'Obra San Lorenzo', addressText: 'Santa Cruz' },
  notes: '',
};

export const FORBIDDEN_ENGINEERING_LABELS = [
  '[is_demo]',
  'PRUEBA EQUIPO',
  'Synth',
  'fixture',
  'seeded',
] as const;

/** Existing five Demo party IDs from last-seed-ids.json — never replace. */
export const PROTECTED_FIVE_DEMO_PARTY_IDS = [
  '01M2PM95PV7YP6AECYXSX4GRBW',
  '01M2PMDY71EDWHJG3AFK36TDZ2',
  '01M2PME87FZGJT8R22KPX921Z2',
  '01M2PMF0V0VHHYH19KBXH629E8',
  '01M2PMFXKD9VTWB21SQX0VEDJY',
] as const;

export const JOURNEY_CUSTOMER_INTENDED_INSERTS = [
  'os_parties',
  'os_party_role_assignments',
  'os_commercial_accounts',
  'os_contacts',
  'os_locations',
] as const;

export const JOURNEY_CUSTOMER_ZERO_RECORD_KINDS = [
  'opportunity',
  'quote',
  'order',
  'work_item',
  'production',
  'finished_goods_receipt',
  'purchase_request',
  'delivery_note',
  'warehouse_exit',
  'delivery',
  'customer_conversation',
] as const;

export type JourneyOwnerCandidate = {
  memberId: string;
  personId: string;
  authIdentityId: string;
  email: string;
  accessStatus: string;
  organizationId: string;
};

export type JourneyPipelineCounts = Record<
  (typeof JOURNEY_CUSTOMER_ZERO_RECORD_KINDS)[number],
  number
>;

export type JourneyExistingParty = {
  id: string;
  organizationId: string;
  displayName: string;
  legalName: string | null;
  status: string;
  notes: string | null;
  contactCount: number;
  locationCount: number;
  matchingContact: boolean;
  matchingLocation: boolean;
  ownerMemberId: string | null;
  pipelineCounts: JourneyPipelineCounts;
};

export type JourneySeedDecision = 'insert' | 'reuse' | 'refuse';

export function emptyPipelineCounts(): JourneyPipelineCounts {
  return Object.fromEntries(JOURNEY_CUSTOMER_ZERO_RECORD_KINDS.map((kind) => [kind, 0])) as JourneyPipelineCounts;
}

export function journeyCustomerUserVisibleStrings(): readonly string[] {
  return [
    JOURNEY_CUSTOMER.displayName,
    JOURNEY_CUSTOMER.legalName,
    JOURNEY_CUSTOMER.tradeName,
    JOURNEY_CUSTOMER.relationshipLabel,
    JOURNEY_CUSTOMER.statusLabel,
    JOURNEY_CUSTOMER.contact.givenName,
    JOURNEY_CUSTOMER.contact.familyName,
    JOURNEY_CUSTOMER.contact.phone,
    JOURNEY_CUSTOMER.location.label,
    JOURNEY_CUSTOMER.location.addressText,
    JOURNEY_CUSTOMER.notes,
  ];
}

export function findForbiddenEngineeringLabels(values: readonly string[]): string[] {
  return [...new Set(FORBIDDEN_ENGINEERING_LABELS.filter((label) => values.some((value) => value.includes(label))))];
}

export function assertNoForbiddenEngineeringLabels(values: readonly string[]): void {
  const hits = findForbiddenEngineeringLabels(values);
  if (hits.length > 0) throw new Error(`JOURNEY_CUSTOMER_FORBIDDEN_LABEL:${hits.join(',')}`);
}

export function assertJourneyCustomerIdentity(): void {
  assertOwnerDemoSynthOrg(OWNER_DEMO_SYNTH_ORG);
  assertOwnerDemoNotRealOrg(OWNER_DEMO_SYNTH_ORG);
  assertNotProtectedRealSevenName(JOURNEY_CUSTOMER.displayName);
  assertNotProtectedRealSevenName(JOURNEY_CUSTOMER.legalName);
  assertNotProtectedRealSevenName(JOURNEY_CUSTOMER.tradeName);
  if (!isOwnerDemoDisplayName(JOURNEY_CUSTOMER.displayName)) {
    throw new Error('JOURNEY_CUSTOMER_MISSING_DEMO_PREFIX');
  }
  if (JOURNEY_CUSTOMER.displayName !== JOURNEY_CUSTOMER.legalName) {
    throw new Error('JOURNEY_CUSTOMER_NAME_MISMATCH');
  }
  if (JOURNEY_CUSTOMER.displayName !== JOURNEY_CUSTOMER.tradeName) {
    throw new Error('JOURNEY_CUSTOMER_TRADE_NAME_MISMATCH');
  }
  if (JOURNEY_CUSTOMER.notes !== '') throw new Error('JOURNEY_CUSTOMER_NOTES_MUST_BE_EMPTY');
  assertNoForbiddenEngineeringLabels(journeyCustomerUserVisibleStrings());
}

export function resolveExactlyOneActiveOwner(
  organizationId: string,
  email: string,
  candidates: readonly JourneyOwnerCandidate[],
): JourneyOwnerCandidate {
  assertOwnerDemoSynthOrg(organizationId);
  const wanted = email.trim().toLowerCase();
  const matches = candidates.filter(
    (row) =>
      row.organizationId === organizationId &&
      row.email.trim().toLowerCase() === wanted &&
      row.accessStatus === 'active',
  );
  if (matches.length === 0) throw new Error(`JOURNEY_CUSTOMER_OWNER_NOT_FOUND:${email}`);
  if (matches.length !== 1) throw new Error(`JOURNEY_CUSTOMER_OWNER_AMBIGUOUS:${matches.length}`);
  return matches[0]!;
}

export function pipelineCountsAreZero(counts: JourneyPipelineCounts): boolean {
  return JOURNEY_CUSTOMER_ZERO_RECORD_KINDS.every((kind) => counts[kind] === 0);
}

export function assertPipelineCountsZero(counts: JourneyPipelineCounts): void {
  if (!pipelineCountsAreZero(counts)) {
    throw new Error(`JOURNEY_CUSTOMER_UNEXPECTED_PIPELINE:${JSON.stringify(counts)}`);
  }
}

export function decideJourneyCustomerAction(
  existing: JourneyExistingParty | null,
  expectedOwnerMemberId: string,
): JourneySeedDecision {
  if (!existing) return 'insert';
  const exact =
    existing.organizationId === OWNER_DEMO_SYNTH_ORG &&
    existing.displayName === JOURNEY_CUSTOMER.displayName &&
    (existing.legalName ?? '') === JOURNEY_CUSTOMER.legalName &&
    existing.status === JOURNEY_CUSTOMER.status &&
    (existing.notes ?? '') === '' &&
    existing.contactCount === 1 &&
    existing.matchingContact &&
    existing.locationCount === 1 &&
    existing.matchingLocation &&
    existing.ownerMemberId === expectedOwnerMemberId &&
    pipelineCountsAreZero(existing.pipelineCounts);
  return exact ? 'reuse' : 'refuse';
}

export function matchingJourneyParty(existing: {
  id: string;
  organizationId: string;
  displayName: string;
  legalName: string | null;
  status: string;
  ownerMemberId: string | null;
  contact: { givenName: string; familyName: string; phone: string | null } | null;
  location: { label: string; addressText: string | null } | null;
  extraContacts: number;
  extraLocations: number;
  pipelineCounts: JourneyPipelineCounts;
}): JourneyExistingParty {
  const contact = existing.contact;
  const location = existing.location;
  return {
    id: existing.id,
    organizationId: existing.organizationId,
    displayName: existing.displayName,
    legalName: existing.legalName,
    status: existing.status,
    notes: '',
    contactCount: (contact ? 1 : 0) + existing.extraContacts,
    locationCount: (location ? 1 : 0) + existing.extraLocations,
    matchingContact: Boolean(
      contact &&
        contact.givenName === JOURNEY_CUSTOMER.contact.givenName &&
        contact.familyName === JOURNEY_CUSTOMER.contact.familyName &&
        contact.phone === JOURNEY_CUSTOMER.contact.phone,
    ),
    matchingLocation: Boolean(
      location &&
        location.label === JOURNEY_CUSTOMER.location.label &&
        (location.addressText ?? '') === JOURNEY_CUSTOMER.location.addressText,
    ),
    ownerMemberId: existing.ownerMemberId,
    pipelineCounts: existing.pipelineCounts,
  };
}

export function intendedInsertPlan() {
  return {
    organizationId: OWNER_DEMO_SYNTH_ORG,
    party: {
      displayName: JOURNEY_CUSTOMER.displayName,
      legalName: JOURNEY_CUSTOMER.legalName,
      tradeName: JOURNEY_CUSTOMER.tradeName,
      relationship: JOURNEY_CUSTOMER.relationshipLabel,
      status: JOURNEY_CUSTOMER.statusLabel,
      notes: JOURNEY_CUSTOMER.notes,
    },
    contact: JOURNEY_CUSTOMER.contact,
    location: JOURNEY_CUSTOMER.location,
    ownerEmail: JOURNEY_CUSTOMER.ownerEmail,
    inserts: [...JOURNEY_CUSTOMER_INTENDED_INSERTS],
    commercialOrOperationalRecords: 0 as const,
  };
}

export function demoModeVisibility(displayName: string): { demo: boolean; real: boolean } {
  const demo = isOwnerDemoDisplayName(displayName);
  return { demo, real: !demo };
}

export function assertProtectedFiveUnchanged(beforeIds: readonly string[], afterIds: readonly string[]): void {
  if (beforeIds.length !== PROTECTED_FIVE_DEMO_PARTY_IDS.length) {
    throw new Error('JOURNEY_CUSTOMER_PROTECTED_FIVE_MISSING');
  }
  if (afterIds.join(',') !== beforeIds.join(',')) {
    throw new Error('JOURNEY_CUSTOMER_PROTECTED_FIVE_CHANGED');
  }
}

export function assertRealSevenUnchanged(
  before: readonly { id: string; displayName: string }[],
  after: readonly { id: string; displayName: string }[],
): void {
  if (before.length !== OWNER_DEMO_REAL_SEVEN.length) {
    throw new Error('JOURNEY_CUSTOMER_REAL_SEVEN_NOT_IDENTIFIABLE');
  }
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error('JOURNEY_CUSTOMER_REAL_SEVEN_CHANGED');
  }
}

export function rowIdentifiesProtectedRealName(displayName: string, protectedName: string): boolean {
  const actual = normalizePartyNameForCompare(displayName);
  const expected = normalizePartyNameForCompare(protectedName);
  return actual === expected || actual.includes(expected);
}

export function assertStagingSynthEnvironment(input: {
  databaseName: string;
  databaseUrl: string;
  organizationId: string;
}): void {
  const name = input.databaseName.trim();
  const url = input.databaseUrl.trim();
  const orgId = input.organizationId.trim();
  if (!name || !url || !orgId) throw new Error('JOURNEY_CUSTOMER_ENVIRONMENT_AMBIGUOUS');
  if (/prod/i.test(name) && name !== STAGING_DATABASE_NAME) {
    throw new Error(`JOURNEY_CUSTOMER_REFUSING_PRODUCTION_DATABASE:${name}`);
  }
  if (name !== STAGING_DATABASE_NAME) throw new Error(`UNEXPECTED_DATABASE_NAME:${name}`);
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error('JOURNEY_CUSTOMER_INVALID_DATABASE_URL');
  }
  if (!hostname.includes(STAGING_DATABASE_HOST_MARKER)) {
    throw new Error('JOURNEY_CUSTOMER_REFUSING_NON_STAGING_HOST');
  }
  assertOwnerDemoSynthOrg(orgId);
  assertOwnerDemoNotRealOrg(orgId);
}
