import { COMMAND_REQUIRED_SCOPES, type PartyKind } from '@isalwa/os-contracts';

/** Existing command scope. Not a salesperson create permission. */
export const MASTER_DATA_ADMIN_SCOPE = 'master_data.admin' as const;

export const OWNER_ABSENT_LABEL = 'Sin responsable asignado';

export const CUSTOMER_SELF_SERVICE_COMMANDS = [
  'CreateParty',
  'UpdateParty',
  'UpdateContact',
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
  'DeactivateParty',
  'ReactivateParty',
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

export function buildUpdatePartyPayload(input: {
  partyId: string;
  displayName: string;
  legalName?: string | null;
  expectedVersion: number;
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
  rejectForbiddenKeys(payload);
  return payload;
}

export function buildUpdateContactPayload(input: {
  organizationPartyId: string;
  contactId?: string | null;
  givenName: string;
  familyName: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
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
  const phone = input.phone?.trim();
  const whatsapp = input.whatsapp?.trim();
  const title = input.title?.trim();
  if (email) payload.email = email;
  if (phone) payload.phone = phone;
  if (whatsapp) payload.whatsapp = whatsapp;
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
