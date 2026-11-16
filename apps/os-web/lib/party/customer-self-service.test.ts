import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  CreateLocationPayloadSchema,
  CreatePartyPayloadSchema,
  DeactivateLocationPayloadSchema,
  UpdateContactPayloadSchema,
  UpdateLocationPayloadSchema,
  UpdatePartyPayloadSchema,
  DeactivatePartyPayloadSchema,
  EndContactRelationshipPayloadSchema,
  ReactivatePartyPayloadSchema,
} from '@isalwa/os-contracts';
import {
  CUSTOMER_SELF_SERVICE_COMMANDS,
  CUSTOMER_SELF_SERVICE_FORBIDDEN_COMMANDS,
  LOCATION_UI_CONSTRAINTS,
  OWNER_ABSENT_LABEL,
  OWNER_REASSIGNMENT_COMMAND,
  SCOPES_WITHOUT_CUSTOMER_CREATE,
  AUTOMATIC_SENDS_ABSENT_LABEL,
  PAYMENTS_UNVERIFIED_LABEL,
  archiveObligationLines,
  buildCreateCustomerPayload,
  buildCreateLocationPayload,
  buildEndContactRelationshipPayload,
  buildSetFollowupPreferencePayload,
  buildDeactivatePartyPayload,
  buildReactivatePartyPayload,
  emptyFollowupItems,
  NO_RECORDED_DATE,
  contactRelationEnd,
  formerContactLine,
  buildDeactivateLocationPayload,
  buildUpdateContactPayload,
  buildUpdateLocationPayload,
  buildUpdatePartyPayload,
  canManageContacts,
  canMutateActiveParty,
  commercialOwnerView,
  createCustomerSearchGate,
  customerCommandsRequireMasterDataAdmin,
  formatCoordinates,
  hasMasterDataAdminScope,
  preserveProvenanceUrl,
  provenanceHref,
  provenanceLinkLabel,
  shouldShowCustomerMutations,
  sortLocationsForDisplay,
} from './customer-self-service';

const SHORT_MAPS_URL = 'https://maps.app.goo.gl/abc123XYZ';

function readUi(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

describe('customer self-service authority', () => {
  it('requires master_data.admin for every wired command', () => {
    assert.equal(customerCommandsRequireMasterDataAdmin(), true);
    assert.deepEqual(CUSTOMER_SELF_SERVICE_COMMANDS, [
      'CreateParty',
      'UpdateParty',
      'UpdateContact',
      'ChangeContactEndpoint',
      'RetireContactEndpoint',
      'CreateLocation',
      'UpdateLocation',
      'DeactivateLocation',
    ]);
  });

  it('does not grant salesperson, people admin, or commercial read create authority', () => {
    for (const scope of SCOPES_WITHOUT_CUSTOMER_CREATE) {
      assert.equal(hasMasterDataAdminScope([scope]), false);
      assert.equal(shouldShowCustomerMutations([scope]), false);
      assert.equal(canMutateActiveParty('active', [scope]), false);
    }
    assert.equal(hasMasterDataAdminScope(['master_data.admin']), true);
    assert.equal(shouldShowCustomerMutations(['sales_rep', 'master_data.admin']), true);
  });

  it('does not wire lead, merge, fiscal, or role-policy commands', () => {
    for (const command of CUSTOMER_SELF_SERVICE_FORBIDDEN_COMMANDS) {
      assert.equal((CUSTOMER_SELF_SERVICE_COMMANDS as readonly string[]).includes(command), false);
    }
    assert.ok(CUSTOMER_SELF_SERVICE_FORBIDDEN_COMMANDS.includes('CreateLead'));
    assert.ok(CUSTOMER_SELF_SERVICE_FORBIDDEN_COMMANDS.includes('RequestPartyMerge'));
    assert.ok(CUSTOMER_SELF_SERVICE_FORBIDDEN_COMMANDS.includes('UpdateFiscalIdentity'));
  });
});

describe('add customer', () => {
  it('builds CreateParty with customer role, contact, phone or no-phone reason, without tenant or fiscal fields', () => {
    const withPhone = buildCreateCustomerPayload({
      displayName: '  Ferretería Norte  ',
      partyKind: 'organization',
      contactGivenName: 'Ana',
      contactFamilyName: 'Pérez',
      phone: { country: 'BO', number: '70011001' },
    });
    assert.equal(withPhone.ok, true);
    if (!withPhone.ok) return;
    assert.equal(CreatePartyPayloadSchema.safeParse(withPhone.payload).success, true);
    assert.equal(withPhone.payload.initialRoleKey, 'customer');
    assert.equal(withPhone.payload.createCommercialAccount, true);
    assert.equal(withPhone.payload.displayName, 'Ferretería Norte');
    assert.deepEqual(withPhone.payload.contact, { givenName: 'Ana', familyName: 'Pérez' });
    assert.deepEqual(withPhone.payload.phone, { country: 'BO', number: '70011001' });
    assert.equal('organizationId' in withPhone.payload, false);
    assert.equal('ownerMemberId' in withPhone.payload, false);
    assert.equal('fiscalIdentity' in withPhone.payload, false);
    assert.equal('nit' in withPhone.payload, false);

    const noPhone = buildCreateCustomerPayload({
      displayName: 'Sin Teléfono',
      partyKind: 'organization',
      contactGivenName: 'Luis',
      noPhoneAvailable: true,
    });
    assert.equal(noPhone.ok && noPhone.payload.noPhoneReason, 'no_phone_available');

    const missingContact = buildCreateCustomerPayload({
      displayName: 'Empresa',
      partyKind: 'organization',
      phone: { country: 'BO', number: '70011001' },
    });
    assert.equal(missingContact.ok, false);
  });

  it('does not silent-merge: search and explicit confirmation are required', () => {
    assert.equal(createCustomerSearchGate({ searchedQuery: '', confirmDistinct: true, hasMoreMatches: false }).ok, false);
    assert.equal(createCustomerSearchGate({ searchedQuery: 'a', confirmDistinct: true, hasMoreMatches: false }).ok, false);
    assert.equal(
      createCustomerSearchGate({ searchedQuery: 'Norte', confirmDistinct: false, hasMoreMatches: false }).ok,
      false,
    );
    assert.equal(
      createCustomerSearchGate({ searchedQuery: 'Norte', confirmDistinct: true, hasMoreMatches: true }).ok,
      false,
    );
    assert.equal(
      createCustomerSearchGate({ searchedQuery: 'Norte', confirmDistinct: true, hasMoreMatches: false }).ok,
      true,
    );
  });
});

describe('edit customer', () => {
  it('updates supported party fields and can clear legal name without fiscal identity', () => {
    const payload = buildUpdatePartyPayload({
      partyId: 'party-1',
      displayName: 'Norte',
      legalName: '   ',
      expectedVersion: 2,
    });
    assert.equal(UpdatePartyPayloadSchema.safeParse(payload).success, true);
    assert.equal(payload.legalName, null);
    assert.equal('nit' in payload, false);
    assert.equal('organizationId' in payload, false);
    assert.equal('ownerMemberId' in payload, false);
  });

  it('updates contact fields on the organization party only through UpdateContact', () => {
    const payload = buildUpdateContactPayload({
      organizationPartyId: 'party-1',
      contactId: 'contact-1',
      givenName: 'Ana',
      familyName: 'Ríos',
      email: 'ana@norte.bo',
      phone: { country: 'BO', number: '70000000' },
    });
    assert.equal(UpdateContactPayloadSchema.safeParse(payload).success, true);
    assert.equal('phone' in payload, false, 'an existing contact never carries numbers');
    const added = buildUpdateContactPayload({
      organizationPartyId: 'party-1',
      givenName: 'Eva',
      familyName: 'Ríos',
      whatsapp: { country: 'BO', number: '7000 0000' },
    });
    assert.equal(UpdateContactPayloadSchema.safeParse(added).success, true);
    assert.deepEqual(added.whatsapp, { country: 'BO', number: '7000 0000' });
    assert.equal(canManageContacts('organization', 'active', ['master_data.admin']), true);
    assert.equal(canManageContacts('person', 'active', ['master_data.admin']), false);
    assert.equal(canManageContacts('organization', 'active', ['sales_rep']), false);
  });
});

describe('commercial owner', () => {
  it('renders a read-only owner and an honest absent label', () => {
    const assigned = commercialOwnerView('mem-1', 'Ana Ríos');
    const absent = commercialOwnerView(null);
    assert.equal(assigned.readOnly, true);
    assert.equal(assigned.canReassign, false);
    assert.equal(assigned.reassignmentCommand, null);
    assert.equal(assigned.label, 'Ana Ríos');
    assert.equal(absent.label, OWNER_ABSENT_LABEL);
    assert.equal(OWNER_REASSIGNMENT_COMMAND, 'ReassignCommercialAccountOwner');
    const authorized = commercialOwnerView('mem-1', 'Ana Ríos', true);
    assert.equal(authorized.canReassign, true);
    assert.equal(authorized.reassignmentCommand, 'ReassignCommercialAccountOwner');
    assert.equal(
      (CUSTOMER_SELF_SERVICE_COMMANDS as readonly string[]).some((name) => /owner|reassign/i.test(name)),
      false,
    );
  });
});

describe('locations', () => {
  it('lists coordinates and preserves provenance URL without geocoding', () => {
    assert.equal(formatCoordinates(-16.5, -68.15), '-16.5, -68.15');
    assert.equal(formatCoordinates(null, null), null);
    assert.equal(provenanceHref(SHORT_MAPS_URL), SHORT_MAPS_URL);
    assert.equal(provenanceLinkLabel(SHORT_MAPS_URL), 'Abrir origen en Maps');
    assert.equal(provenanceLinkLabel('https://www.google.com/maps/place/Norte'), 'Abrir origen en Maps');
    assert.equal(provenanceLinkLabel('https://goo.gl/maps/abc'), 'Abrir origen en Maps');
    assert.equal(provenanceLinkLabel('https://example.com/lugar'), 'Abrir enlace de procedencia');
    const preserved = preserveProvenanceUrl(`  ${SHORT_MAPS_URL}  `);
    assert.equal(preserved.ok && preserved.url, SHORT_MAPS_URL);
  });

  it('creates, updates, and deactivates without tenant, map, or geocode fields', () => {
    const created = buildCreateLocationPayload({
      partyId: 'party-1',
      label: 'Depósito',
      addressText: 'Av. Blanco Galindo',
      provenanceUrl: SHORT_MAPS_URL,
    });
    assert.equal(CreateLocationPayloadSchema.safeParse(created).success, true);
    assert.equal(created.provenanceUrl, SHORT_MAPS_URL);
    assert.equal('latitude' in created, false);
    assert.equal('organizationId' in created, false);

    const updated = buildUpdateLocationPayload({
      locationId: 'loc-1',
      label: 'Depósito',
      addressText: null,
      latitude: -16.5,
      longitude: -68.15,
      provenanceUrl: SHORT_MAPS_URL,
      expectedVersion: 1,
    });
    assert.equal(UpdateLocationPayloadSchema.safeParse(updated).success, true);
    assert.equal(updated.provenanceUrl, SHORT_MAPS_URL);

    const deactivated = buildDeactivateLocationPayload('loc-1');
    assert.equal(DeactivateLocationPayloadSchema.safeParse(deactivated).success, true);
    assert.deepEqual(Object.keys(deactivated), ['locationId']);
  });

  it('does not add map, geocode, territory, or route behavior', () => {
    assert.deepEqual(LOCATION_UI_CONSTRAINTS, {
      map: false,
      geocode: false,
      resolveShortLinks: false,
      territory: false,
      routeCheckIn: false,
    });
    const ordered = sortLocationsForDisplay([
      { id: 'b', status: 'inactive' },
      { id: 'a', status: 'active' },
      { id: 'c', status: 'inactive' },
    ]);
    assert.deepEqual(ordered.map((item) => item.id), ['a', 'b', 'c']);
  });
});

describe('customer self-service UI contract', () => {
  const actions = readUi('./actions.ts');
  const owner = readUi('../../components/party/commercial-owner-line.tsx');
  const edit = readUi('../../components/party/customer-edit-forms.tsx');
  const locations = readUi('../../components/party/customer-location-panel.tsx');
  const create = readUi('../../components/party/customer-create-form.tsx');

  it('gates customer creation on commercial.customer.create (or steward), leaves customer edits to the API rule, and does not read tenant or owner from the form', () => {
    assert.match(actions, /actorCanCreateCustomer/);
    assert.match(actions, /actorCanMutateMasterData/);
    const body = (name: string) => {
      const start = actions.indexOf(`export async function ${name}`);
      const next = actions.indexOf('export async function', start + 1);
      return actions.slice(start, next === -1 ? undefined : next);
    };
    assert.match(body('createCustomerAction'), /createCustomerClient\(\)/);
    assert.doesNotMatch(body('createCustomerAction'), /adminClient\(\)/);
    for (const name of [
      'updateCustomerAction',
      'updateContactAction',
      'changeContactPhoneAction',
      'retireContactPhoneAction',
      'createLocationAction',
      'updateLocationAction',
      'deactivateLocationAction',
    ]) {
      assert.match(body(name), /customerClient\(\)/, name);
      assert.doesNotMatch(body(name), /adminClient/, name);
    }
    assert.match(body('updateCustomerAction'), /formData\.has\('legalName'\)/);
    assert.doesNotMatch(actions, /formData\.get\('organizationId'\)/);
    assert.doesNotMatch(actions, /formData\.get\('ownerMemberId'\)/);
    assert.doesNotMatch(actions, /formData\.get\('nit'\)/);
    assert.doesNotMatch(actions, /CreateLead|RequestPartyMerge|UpdateFiscalIdentity|ApprovePartyMerge/);
  });

  it('keeps owner display and only offers reassignment through an explicit confirmed control', () => {
    assert.match(owner, /owner\.label/);
    assert.match(owner, /owner\.canReassign/);
    assert.doesNotMatch(owner, /people\.admin|commercial\.(team|org)\.read/);
    const form = readUi('../../components/party/reassign-owner-form.tsx');
    assert.match(form, /Confirmo el cambio de responsable/);
    assert.match(form, /reassignCommercialAccountOwnerAction/);
    assert.doesNotMatch(edit, /UpdateFiscalIdentity|fiscalIdentity|name="nit"|name="ownerMemberId"/);
    assert.doesNotMatch(create, /CreateLead|RequestPartyMerge|name="nit"|name="ownerMemberId"|name="roleKey"/);
    assert.match(create, /contactGivenName/);
    assert.match(create, /noPhoneAvailable/);
    assert.match(create, /duplicateReason/);
  });

  it('does not add a map, geocoder, or short-link resolver in the location panel', () => {
    assert.doesNotMatch(locations, /leaflet|mapbox|google\.maps|iframe|geocode|territory|check-in|checkin/i);
    assert.match(locations, /provenanceHref/);
    assert.match(locations, /createLocationAction|updateLocationAction|deactivateLocationAction/);
  });
});

describe('T03 ending a contact relationship', () => {
  it('requires a reason, keeps commitments on the customer, and never offers cancellable sends', () => {
    assert.equal(AUTOMATIC_SENDS_ABSENT_LABEL, 'Envíos automáticos no configurados.');
    assert.equal(buildEndContactRelationshipPayload({ partyId: 'p', contactId: 'c', expectedVersion: 1, reason: 'other', reasonNote: 'corto' }).ok, false);
    const built = buildEndContactRelationshipPayload({
      partyId: 'p',
      contactId: 'c',
      expectedVersion: 1,
      reason: 'left_company',
      endedOn: '2026-10-01',
      today: '2026-10-18',
    });
    assert.equal(built.ok && built.payload.reason, 'left_company');
    assert.equal(formerContactLine({ status: 'active', reason: 'left_company' }), null);
    assert.equal(
      formerContactLine({ status: 'inactive', endedOn: '2026-10-01', reason: 'left_company', reasonNote: 'Pasó a otra empresa' }),
      'Contacto anterior · 01/10/2026 · Dejó la empresa · Pasó a otra empresa',
    );
    assert.equal(formerContactLine({ status: 'inactive', reason: 'left_company' }), `Contacto anterior · ${NO_RECORDED_DATE} · Dejó la empresa`);
    assert.equal(formerContactLine({ status: 'inactive' }), `Contacto inactivo · ${NO_RECORDED_DATE}`);
    assert.doesNotMatch(readUi('../../components/party/contact-relationship-panel.tsx'), /\{item\.state\}|\{item\.dueAt\}|` · \$\{item\.dueAt\}`/);
    assert.doesNotMatch(readUi('../../components/party/contact-relationship-panel.tsx'), /cancelar envío|envíos pendientes/i);
    assert.match(readUi('../../components/party/contact-relationship-panel.tsx'), /Compromisos abiertos del cliente/);
  });

  it('keeps the end date and reason when the end event is outside the loaded timeline', () => {
    const contact = { relationEndedAt: '2026-10-01T04:00:00.000Z', relationEndReason: 'role_changed' };
    assert.deepEqual(contactRelationEnd(contact), { endedOn: '2026-10-01', reason: 'role_changed', reasonNote: undefined });
    assert.deepEqual(
      contactRelationEnd(contact, { endedOn: '2026-10-01', reason: 'other', reasonNote: 'Se jubiló este mes' }),
      { endedOn: '2026-10-01', reason: 'other', reasonNote: 'Se jubiló este mes' },
    );
    assert.deepEqual(contactRelationEnd({ relationEndedAt: null, relationEndReason: null }), {
      endedOn: undefined,
      reason: undefined,
      reasonNote: undefined,
    });
  });
});

describe('T03 follow-up preferences', () => {
  it('keeps no promociones and no me escriban apart, and allows only as a staff record', () => {
    const base = { partyId: 'p', contactId: 'c', channel: 'whatsapp', expectedVersion: 0, identityConfirmed: false };
    const restrict = buildSetFollowupPreferencePayload({ ...base, preference: 'no_promotions' });
    assert.equal(restrict.ok && restrict.payload.preference, 'no_promotions');
    assert.equal(restrict.ok && restrict.payload.source, 'staff_recorded');
    assert.equal(buildSetFollowupPreferencePayload({ ...base, preference: 'allowed', note: 'sí' }).ok, false);
    const allowed = buildSetFollowupPreferencePayload({
      ...base,
      preference: 'allowed',
      identityConfirmed: true,
      note: 'La persona confirmó en tienda que quiere seguimiento',
    });
    assert.equal(allowed.ok && allowed.payload.source, 'staff_recorded');
    const panel = readUi('../../components/party/contact-followup-panel.tsx');
    assert.match(panel, /No más promociones/);
    assert.match(panel, /No me escriban/);
    assert.doesNotMatch(panel, /customer_message|defaultValue=\{item\.preference\}/);
  });
});

describe('T03 archive and reactivation', () => {
  it('lists obligations by kind and never presents payments as zero', () => {
    assert.equal(PAYMENTS_UNVERIFIED_LABEL, 'Pagos: no verificados en esta versión');
    assert.deepEqual(
      archiveObligationLines({ openOrders: 1, openCommitments: 0, openIssues: 2, openWorkItems: 0 }).map((line) => line.kind),
      ['Pedidos abiertos', 'Compromisos abiertos', 'Incidencias abiertas', 'Trabajos abiertos'],
    );
    const panel = readUi('../../components/party/customer-archive-panel.tsx');
    assert.match(panel, /PAYMENTS_UNVERIFIED_LABEL/);
    assert.doesNotMatch(panel, /Pagos: 0/);
    const forbidden: readonly string[] = CUSTOMER_SELF_SERVICE_FORBIDDEN_COMMANDS;
    assert.equal(forbidden.includes('DeactivateParty'), false);
    assert.equal(forbidden.includes('ReactivateParty'), false);
  });
});

describe('T03 customer finishing (Stage A)', () => {
  it('refuses a short optional note by field instead of sending it to a generic server refusal', () => {
    const base = { partyId: 'p', contactId: 'c', expectedVersion: 1, reason: 'left_company', today: '2026-11-13' };
    const short = buildEndContactRelationshipPayload({ ...base, reasonNote: 'corto' });
    assert.equal(short.ok, false);
    assert.deepEqual(!short.ok && short.fieldErrors, { reasonNote: 'El detalle debe tener entre 10 y 500 caracteres, o quedar vacío.' });
    assert.equal(EndContactRelationshipPayloadSchema.safeParse({ partyId: 'p', contactId: 'c', expectedVersion: 1, reason: 'left_company', reasonNote: 'corto' }).success, false);
    const empty = buildEndContactRelationshipPayload({ ...base, reasonNote: '   ' });
    assert.equal(empty.ok && 'reasonNote' in empty.payload, false);
    const missingOther = buildEndContactRelationshipPayload({ ...base, reason: 'other' });
    assert.equal(!missingOther.ok && missingOther.fieldErrors?.reasonNote !== undefined, true);
  });

  it('builds archive and reactivation payloads the server accepts, and refuses what it refuses', () => {
    const archive = buildDeactivatePartyPayload({ partyId: 'p', expectedVersion: 3, reason: 'no_longer_operating', reasonNote: '' });
    assert.deepEqual(archive, { ok: true, payload: { partyId: 'p', expectedVersion: 3, reason: 'no_longer_operating' } });
    assert.equal(archive.ok && DeactivatePartyPayloadSchema.safeParse(archive.payload).success, true);
    const archiveOther = buildDeactivatePartyPayload({ partyId: 'p', expectedVersion: 3, reason: 'other', reasonNote: 'Cerró su local en el mercado' });
    assert.equal(archiveOther.ok && DeactivatePartyPayloadSchema.safeParse(archiveOther.payload).success, true);
    for (const bad of [
      { reason: 'other', reasonNote: '' },
      { reason: 'no_longer_operating', reasonNote: 'corto' },
      { reason: 'closed', reasonNote: '' },
    ]) {
      assert.equal(buildDeactivatePartyPayload({ partyId: 'p', expectedVersion: 3, ...bad }).ok, false, JSON.stringify(bad));
    }
    const reactivate = buildReactivatePartyPayload({ partyId: 'p', expectedVersion: 4, reasonNote: '  Volvió a comprar en noviembre  ' });
    assert.deepEqual(reactivate, { ok: true, payload: { partyId: 'p', expectedVersion: 4, reasonNote: 'Volvió a comprar en noviembre' } });
    assert.equal(reactivate.ok && ReactivatePartyPayloadSchema.safeParse(reactivate.payload).success, true);
    const short = buildReactivatePartyPayload({ partyId: 'p', expectedVersion: 4, reasonNote: 'volvió' });
    assert.equal(!short.ok && short.fieldErrors?.reasonNote !== undefined, true);
  });

  it('gives a contact without a record one empty entry per channel', () => {
    assert.deepEqual(
      emptyFollowupItems().map((item) => [item.channel, item.preference, item.version]),
      [['whatsapp', null, 0], ['phone', null, 0], ['email', null, 0]],
    );
  });

  it('loads per-contact data only for the managed contact and offers no forms to former contacts', () => {
    const page = readUi('../../app/(app)/clientes/[partyId]/page.tsx');
    assert.doesNotMatch(page, /getContactFollowupPreferences/);
    assert.match(page, /getCustomerFollowupPreferences\(partyId\)/);
    assert.doesNotMatch(page, /contacts\.map\(async/);
    assert.match(page, /managedContact && endpointAuthority\.canReviewEndpointHistory/);
    assert.match(page, /managedContact && canEndContactRelationship && isCurrentContact\(managedContact\)/);
    assert.match(page, /customerActive && contact\.status === 'active' && !contact\.relationEndedAt/);
    assert.match(page, /contacts=\{contacts\.filter\(isCurrentContact\)\}/);
    const panel = readUi('../../components/party/contact-endpoint-panel.tsx');
    assert.match(panel, /managing && current && authority\.canChangeEndpoints/);
    assert.match(panel, /managing && current && authority\.canResolveIdentityReview && phoneReview/);
  });

  it('keeps one commercial-name form, in the actions drawer', () => {
    const page = readUi('../../app/(app)/clientes/[partyId]/page.tsx');
    assert.doesNotMatch(page, /<CustomerEditForms/);
  });

  it('never shows a failed load as an empty value', () => {
    assert.match(readUi('../../components/party/contact-followup-panel.tsx'), /items === null[\s\S]*No pudimos cargar estos datos\./);
    assert.match(readUi('../../components/party/contact-endpoint-panel.tsx'), /history === null[\s\S]*No pudimos cargar estos datos\./);
  });
});
