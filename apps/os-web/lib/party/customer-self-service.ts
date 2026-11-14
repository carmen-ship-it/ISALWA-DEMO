import {
  COMMAND_REQUIRED_SCOPES,
  CONTACT_RELATION_END_REASONS,
  PARTY_ARCHIVE_REASONS,
  PARTY_CHANGE_KINDS,
  FOLLOWUP_CHANNELS,
  FOLLOWUP_PREFERENCES,
  followupPreferenceInputProblem,
  partyChangeNeedsReason,
  type PartyChangeKind,
  type PartyKind,
} from '@isalwa/os-contracts';

/** Existing command scope. Not a salesperson create permission. */
export const MASTER_DATA_ADMIN_SCOPE = 'master_data.admin' as const;

export const OWNER_ABSENT_LABEL = 'Sin responsable asignado';

export const CUSTOMER_SELF_SERVICE_COMMANDS = [
  'CreateParty',
  'UpdateParty',
  'UpdateContact',
  'ChangeContactEndpoint',
  'RetireContactEndpoint',
  'CreateLocation',
  'UpdateLocation',
  'DeactivateLocation',
] as const;

/** Explicitly not wired. Owner reassignment has no command in this slice. */
export const CUSTOMER_SELF_SERVICE_FORBIDDEN_COMMANDS = [
  'CreateLead',
  'ResolveLead',
  'RequestPartyMerge',
  'ApprovePartyMerge',
  'RejectPartyMerge',
  'UpdateFiscalIdentity',
  'AssignPartyRole',
  'EndPartyRole',
] as const;

export const OWNER_REASSIGNMENT_COMMAND = 'ReassignCommercialAccountOwner' as const;

export const LOCATION_UI_CONSTRAINTS = {
  map: false,
  geocode: false,
  resolveShortLinks: false,
  territory: false,
  routeCheckIn: false,
} as const;

/** Scopes that must not unlock customer or location mutations. */
export const SCOPES_WITHOUT_CUSTOMER_CREATE = [
  'sales_rep',
  'sales_manager',
  'member_active',
  'people.admin',
  'commercial.team.read',
  'commercial.org.read',
] as const;

export const PARTY_KINDS_FOR_CUSTOMER = ['organization', 'person'] as const;

const FORBIDDEN_PAYLOAD_KEYS = [
  'organizationId',
  'ownerMemberId',
  'nit',
  'fiscalIdentity',
  'razonSocial',
  'mergeRequestId',
  'sourcePartyId',
  'targetPartyId',
  'leadId',
] as const;

export function hasMasterDataAdminScope(roleKeys: readonly string[]): boolean {
  return roleKeys.includes(MASTER_DATA_ADMIN_SCOPE);
}

export function shouldShowCustomerMutations(roleKeys: readonly string[]): boolean {
  return hasMasterDataAdminScope(roleKeys);
}

export function customerCommandsRequireMasterDataAdmin(): boolean {
  return CUSTOMER_SELF_SERVICE_COMMANDS.every(
    (command) => COMMAND_REQUIRED_SCOPES[command] === MASTER_DATA_ADMIN_SCOPE,
  );
}

export type CommercialOwnerView = {
  readOnly: boolean;
  reassignmentCommand: typeof OWNER_REASSIGNMENT_COMMAND | null;
  label: string;
  canReassign: boolean;
};

export function commercialOwnerView(
  ownerMemberId: string | null | undefined,
  resolvedLabel?: string | null,
  canReassign = false,
): CommercialOwnerView {
  const id = ownerMemberId?.trim() ?? '';
  const label = id ? resolvedLabel?.trim() || 'Miembro del equipo' : OWNER_ABSENT_LABEL;
  return {
    readOnly: !canReassign,
    reassignmentCommand: canReassign ? OWNER_REASSIGNMENT_COMMAND : null,
    label,
    canReassign,
  };
}

export function canMutateActiveParty(status: string, roleKeys: readonly string[]): boolean {
  return status === 'active' && hasMasterDataAdminScope(roleKeys);
}

export function canManageContacts(partyKind: string, status: string, roleKeys: readonly string[]): boolean {
  return partyKind === 'organization' && canMutateActiveParty(status, roleKeys);
}

function rejectForbiddenKeys(payload: Record<string, unknown>): void {
  for (const key of FORBIDDEN_PAYLOAD_KEYS) {
    if (key in payload) {
      throw new Error(`TENANT_OR_FORBIDDEN_FIELD:${key}`);
    }
  }
}

export function buildCreateCustomerPayload(input: {
  displayName: string;
  partyKind: PartyKind;
  legalName?: string | null;
}): Record<string, unknown> {
  const displayName = input.displayName.trim();
  const payload: Record<string, unknown> = {
    partyKind: input.partyKind,
    displayName,
    initialRoleKey: 'customer',
    createCommercialAccount: true,
  };
  const legalName = input.legalName?.trim();
  if (legalName) payload.legalName = legalName;
  rejectForbiddenKeys(payload);
  return payload;
}

export function createCustomerSearchGate(input: {
  searchedQuery: string;
  confirmDistinct: boolean;
  hasMoreMatches: boolean;
}): { ok: true } | { ok: false; error: string } {
  const query = input.searchedQuery.trim();
  if (query.length < 2) {
    return {
      ok: false,
      error: 'Busque primero. No se crea un cliente sin revisar coincidencias.',
    };
  }
  if (input.hasMoreMatches) {
    return {
      ok: false,
      error: 'Hay más coincidencias. Afine la búsqueda antes de crear. No se fusiona en silencio.',
    };
  }
  if (!input.confirmDistinct) {
    return {
      ok: false,
      error: 'Confirme que no es un cliente existente. No se fusiona en silencio.',
    };
  }
  return { ok: true };
}

export const PARTY_CHANGE_KIND_OPTIONS: ReadonlyArray<{ value: PartyChangeKind; label: string }> = [
  { value: 'update', label: 'Actualización (el dato cambió)' },
  { value: 'correction', label: 'Corrección (se registró mal)' },
  { value: 'typo', label: 'Error de escritura en el nombre' },
];

export function parsePartyChangeKind(value: unknown): PartyChangeKind {
  return (PARTY_CHANGE_KINDS as readonly string[]).includes(String(value)) ? (String(value) as PartyChangeKind) : 'update';
}

/** Mirrors the UpdateParty rule so the form can ask for the reason before sending; the server rechecks. */
export function partyEditReasonError(input: {
  previous: { displayName: string; legalName: string | null };
  displayName: string;
  legalName: string | null;
  changeReason: string;
}): string | null {
  const changedFields = [
    ...(input.displayName.trim() !== input.previous.displayName ? ['displayName'] : []),
    ...((input.legalName?.trim() || null) !== (input.previous.legalName || null) ? ['legalName'] : []),
  ];
  if (!partyChangeNeedsReason({ changedFields }) || input.changeReason.trim()) return null;
  return 'Indique el motivo del cambio.';
}

export function buildUpdatePartyPayload(input: {
  partyId: string;
  displayName: string;
  legalName?: string | null;
  expectedVersion: number;
  changeReason?: string | null;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    partyId: input.partyId.trim(),
    displayName: input.displayName.trim(),
    expectedVersion: input.expectedVersion,
  };
  if (input.legalName !== undefined) {
    const legalName = input.legalName?.trim() ?? '';
    payload.legalName = legalName || null;
  }
  const changeReason = input.changeReason?.trim();
  if (changeReason) payload.changeReason = changeReason;
  rejectForbiddenKeys(payload);
  return payload;
}

export const CONTACT_RELATION_END_LABELS: Record<string, string> = {
  left_company: 'Dejó la empresa',
  role_changed: 'Cambió de función',
  duplicate_contact: 'Contacto duplicado',
  other: 'Otro',
};

export const AUTOMATIC_SENDS_ABSENT_LABEL = 'Envíos automáticos no configurados.';

export function laPazToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Former contact line. The note appears only when the timeline event carries it. */
export function formerContactLine(input: {
  status: string;
  endedOn?: string | null;
  reason?: string | null;
  reasonNote?: string | null;
}): string | null {
  if (input.status === 'active') return null;
  const reason = input.reason ? CONTACT_RELATION_END_LABELS[input.reason] : null;
  return ['Contacto anterior', input.endedOn || null, reason, input.reasonNote?.trim() || null].filter(Boolean).join(' · ');
}

/**
 * End date and reason for a former contact. The timeline event wins when it is in
 * the loaded window; otherwise the contact row still carries date and reason.
 * The free-text note exists only on the timeline event.
 */
export function contactRelationEnd(
  contact: { relationEndedAt?: string | null; relationEndReason?: string | null },
  timelineEvent?: { endedOn?: string; reason?: string; reasonNote?: string },
): { endedOn?: string; reason?: string; reasonNote?: string } {
  const endedOn =
    timelineEvent?.endedOn ??
    (contact.relationEndedAt ? laPazToday(new Date(contact.relationEndedAt)) : undefined);
  return {
    endedOn,
    reason: timelineEvent?.reason ?? contact.relationEndReason ?? undefined,
    reasonNote: timelineEvent?.reasonNote,
  };
}

export function buildEndContactRelationshipPayload(input: {
  partyId: string;
  contactId: string;
  expectedVersion: number;
  reason: string;
  reasonNote?: string | null;
  endedOn?: string | null;
  today?: string;
}): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
  if (!(CONTACT_RELATION_END_REASONS as readonly string[]).includes(input.reason)) {
    return { ok: false, error: 'Elija el motivo.' };
  }
  const reasonNote = input.reasonNote?.trim() ?? '';
  if (input.reason === 'other' && (reasonNote.length < 10 || reasonNote.length > 500)) {
    return { ok: false, error: 'Describa el motivo (entre 10 y 500 caracteres).' };
  }
  const endedOn = input.endedOn?.trim() ?? '';
  if (endedOn && !/^\d{4}-\d{2}-\d{2}$/.test(endedOn)) return { ok: false, error: 'La fecha no es válida.' };
  if (endedOn && endedOn > (input.today ?? laPazToday())) return { ok: false, error: 'La fecha no puede ser futura.' };
  if (!input.partyId || !input.contactId || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
    return { ok: false, error: 'No se pudo guardar. Actualice la página e intente de nuevo.' };
  }
  return {
    ok: true,
    payload: {
      partyId: input.partyId,
      contactId: input.contactId,
      expectedVersion: input.expectedVersion,
      reason: input.reason,
      ...(reasonNote ? { reasonNote } : {}),
      ...(endedOn ? { endedOn } : {}),
    },
  };
}

export const PARTY_ARCHIVE_REASON_LABELS: Record<string, string> = {
  no_longer_operating: 'Ya no opera',
  no_current_commercial_relationship: 'Sin relación comercial vigente',
  duplicate_under_review: 'Posible duplicado en revisión',
  other: 'Otro',
};

export const PAYMENTS_UNVERIFIED_LABEL = 'Pagos: no verificados en esta versión';

export function archiveObligationLines(obligations: {
  openOrders: number;
  openCommitments: number;
  openIssues: number;
  openWorkItems: number;
}): Array<{ kind: string; count: number }> {
  return [
    { kind: 'Pedidos abiertos', count: obligations.openOrders },
    { kind: 'Compromisos abiertos', count: obligations.openCommitments },
    { kind: 'Incidencias abiertas', count: obligations.openIssues },
    { kind: 'Trabajos abiertos', count: obligations.openWorkItems },
  ];
}

export function buildDeactivatePartyPayload(input: {
  partyId: string;
  expectedVersion: number;
  reason: string;
  reasonNote?: string | null;
}): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
  if (!(PARTY_ARCHIVE_REASONS as readonly string[]).includes(input.reason)) return { ok: false, error: 'Elija el motivo.' };
  const reasonNote = input.reasonNote?.trim() ?? '';
  if (input.reason === 'other' && (reasonNote.length < 10 || reasonNote.length > 500)) {
    return { ok: false, error: 'Describa el motivo (entre 10 y 500 caracteres).' };
  }
  if (!input.partyId || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
    return { ok: false, error: 'No se pudo guardar. Actualice la página e intente de nuevo.' };
  }
  return {
    ok: true,
    payload: {
      partyId: input.partyId,
      expectedVersion: input.expectedVersion,
      reason: input.reason,
      ...(reasonNote ? { reasonNote } : {}),
    },
  };
}

export function buildReactivatePartyPayload(input: {
  partyId: string;
  expectedVersion: number;
  reasonNote: string;
}): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
  const reasonNote = input.reasonNote.trim();
  if (reasonNote.length < 10 || reasonNote.length > 500) {
    return { ok: false, error: 'Escriba el motivo (entre 10 y 500 caracteres).' };
  }
  if (!input.partyId || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
    return { ok: false, error: 'No se pudo guardar. Actualice la página e intente de nuevo.' };
  }
  return { ok: true, payload: { partyId: input.partyId, expectedVersion: input.expectedVersion, reasonNote } };
}

export const FOLLOWUP_PREFERENCE_LABELS: Record<string, string> = {
  no_promotions: 'No más promociones',
  no_unsolicited_followups: 'No me escriban',
  allowed: 'Permitir seguimiento',
};

export function buildSetFollowupPreferencePayload(input: {
  partyId: string;
  contactId: string;
  channel: string;
  preference: string;
  expectedVersion: number;
  identityConfirmed: boolean;
  note?: string | null;
}): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
  if (!(FOLLOWUP_CHANNELS as readonly string[]).includes(input.channel)) return { ok: false, error: 'Elija el canal.' };
  if (!(FOLLOWUP_PREFERENCES as readonly string[]).includes(input.preference)) return { ok: false, error: 'Elija la preferencia.' };
  const note = input.note?.trim() ?? '';
  const source = input.preference === 'allowed' ? 'staff_recorded' : 'staff_recorded';
  const problem = followupPreferenceInputProblem({
    preference: input.preference,
    source,
    identityConfirmed: input.identityConfirmed,
    note,
  });
  if (problem && input.preference === 'allowed') {
    return { ok: false, error: 'Permitir seguimiento requiere identidad confirmada y una nota de al menos 10 caracteres.' };
  }
  if (!input.partyId || !input.contactId || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
    return { ok: false, error: 'No se pudo guardar. Actualice la página e intente de nuevo.' };
  }
  return {
    ok: true,
    payload: {
      partyId: input.partyId,
      contactId: input.contactId,
      channel: input.channel,
      preference: input.preference,
      source,
      identityConfirmed: input.preference === 'allowed' ? true : input.identityConfirmed,
      expectedVersion: input.expectedVersion,
      ...(note ? { note } : {}),
    },
  };
}

export function buildUpdateContactPayload(input: {
  organizationPartyId: string;
  contactId?: string | null;
  givenName: string;
  familyName: string;
  email?: string | null;
  /** Sent only when creating a contact; an existing contact's numbers change through the endpoint commands. */
  phone?: { country: string; number: string } | null;
  whatsapp?: { country: string; number: string } | null;
  title?: string | null;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    organizationPartyId: input.organizationPartyId.trim(),
    givenName: input.givenName.trim(),
    familyName: input.familyName.trim(),
  };
  const contactId = input.contactId?.trim();
  if (contactId) payload.contactId = contactId;
  const email = input.email?.trim();
  const title = input.title?.trim();
  if (email) payload.email = email;
  if (!contactId && input.phone) payload.phone = input.phone;
  if (!contactId && input.whatsapp) payload.whatsapp = input.whatsapp;
  if (title) payload.title = title;
  rejectForbiddenKeys(payload);
  return payload;
}

export function parseCoordinatePair(
  latitudeRaw: string,
  longitudeRaw: string,
): { ok: true; latitude?: number; longitude?: number } | { ok: false; error: string } {
  const latText = latitudeRaw.trim();
  const lngText = longitudeRaw.trim();
  if (!latText && !lngText) return { ok: true };
  if (!latText || !lngText) {
    return { ok: false, error: 'Ingrese latitud y longitud juntas, o déjelas vacías.' };
  }
  const latitude = Number(latText.replace(',', '.'));
  const longitude = Number(lngText.replace(',', '.'));
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { ok: false, error: 'Latitud inválida.' };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { ok: false, error: 'Longitud inválida.' };
  }
  return { ok: true, latitude, longitude };
}

export function preserveProvenanceUrl(raw: string): { ok: true; url?: string } | { ok: false; error: string } {
  const url = raw.trim();
  if (!url) return { ok: true };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: 'El enlace de procedencia no es una URL válida.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'El enlace de procedencia debe ser http o https.' };
  }
  return { ok: true, url };
}

export function buildCreateLocationPayload(input: {
  partyId: string;
  label: string;
  addressText?: string | null;
  latitude?: number;
  longitude?: number;
  provenanceUrl?: string;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    partyId: input.partyId.trim(),
    label: input.label.trim(),
  };
  const addressText = input.addressText?.trim();
  if (addressText) payload.addressText = addressText;
  if (input.provenanceUrl) payload.provenanceUrl = input.provenanceUrl;
  if (input.latitude !== undefined && input.longitude !== undefined) {
    payload.latitude = input.latitude;
    payload.longitude = input.longitude;
  }
  rejectForbiddenKeys(payload);
  return payload;
}

export function buildUpdateLocationPayload(input: {
  locationId: string;
  label: string;
  addressText: string | null;
  latitude: number | null;
  longitude: number | null;
  provenanceUrl: string | null;
  expectedVersion: number;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    locationId: input.locationId.trim(),
    label: input.label.trim(),
    addressText: input.addressText,
    latitude: input.latitude,
    longitude: input.longitude,
    provenanceUrl: input.provenanceUrl,
    expectedVersion: input.expectedVersion,
  };
  rejectForbiddenKeys(payload);
  return payload;
}

export function buildDeactivateLocationPayload(locationId: string): Record<string, unknown> {
  const payload = { locationId: locationId.trim() };
  rejectForbiddenKeys(payload);
  return payload;
}

export function readCoordinate(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatCoordinates(
  latitude: number | string | null | undefined,
  longitude: number | string | null | undefined,
): string | null {
  const lat = readCoordinate(latitude);
  const lng = readCoordinate(longitude);
  if (lat == null || lng == null) return null;
  return `${lat}, ${lng}`;
}

/** Validates protocol only. Returns the original string — no short-link expansion. */
export function provenanceHref(url: string | null | undefined): string | null {
  if (!url) return null;
  const preserved = preserveProvenanceUrl(url);
  if (!preserved.ok || !preserved.url) return null;
  return url;
}

const PROVENANCE_MAPS_LABEL = 'Abrir origen en Maps';
const PROVENANCE_LINK_LABEL = 'Abrir enlace de procedencia';

function isMapsPath(path: string): boolean {
  return path === '/maps' || path.startsWith('/maps/');
}

/** Visible link text only. Does not resolve, expand, or geocode the URL. */
export function provenanceLinkLabel(url: string | null | undefined): string {
  if (!url?.trim()) return PROVENANCE_LINK_LABEL;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return PROVENANCE_LINK_LABEL;
  }
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();
  if (host === 'maps.app.goo.gl' || host === 'maps.google.com' || host.startsWith('maps.google.')) {
    return PROVENANCE_MAPS_LABEL;
  }
  if ((host === 'goo.gl' || host === 'www.goo.gl') && isMapsPath(path)) {
    return PROVENANCE_MAPS_LABEL;
  }
  if (
    (host === 'google.com' || host === 'www.google.com' || host.endsWith('.google.com')) &&
    isMapsPath(path)
  ) {
    return PROVENANCE_MAPS_LABEL;
  }
  return PROVENANCE_LINK_LABEL;
}

export function sortLocationsForDisplay<T extends { status: string }>(locations: readonly T[]): T[] {
  return locations
    .map((location, index) => ({ location, index }))
    .sort((a, b) => {
      const rank = (status: string) => (status === 'active' ? 0 : 1);
      return rank(a.location.status) - rank(b.location.status) || a.index - b.index;
    })
    .map((entry) => entry.location);
}
