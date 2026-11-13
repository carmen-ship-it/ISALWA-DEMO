'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import type { CreateRedirectResult, CommandActionResult } from '@/lib/commercial/command-types';
import { actorCanMutateMasterData } from '@/lib/party/master-data-access';
import {
  buildCreateCustomerPayload,
  buildCreateLocationPayload,
  buildDeactivateLocationPayload,
  buildUpdateContactPayload,
  buildUpdateLocationPayload,
  buildUpdatePartyPayload,
  createCustomerSearchGate,
  PARTY_KINDS_FOR_CUSTOMER,
  parseCoordinatePair,
  buildEndContactRelationshipPayload,
  buildSetFollowupPreferencePayload,
  partyEditReasonError,
  preserveProvenanceUrl,
} from '@/lib/party/customer-self-service';
import {
  buildChangeContactEndpointPayload,
  buildRetireContactEndpointPayload,
  buildResolveContactIdentityReviewPayload,
  buildRevealContactEndpointPayload,
  contactNumberFromForm,
} from '@/lib/party/contact-phone';
import { buildResolveImportPhonePayload, importPhoneCommandMessage } from '@/components/party/import-phone-review';
import { clientesSearchHref, partyHref } from '@/lib/party/navigation';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';
import { redirectKeepingDataMode } from '@/lib/demo/redirect-data-mode';

const DENIED = 'No tiene permiso para realizar esta acción.';

async function adminClient() {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false as const, error: 'Su sesión venció. Vuelva a iniciar sesión.' };
  const client = createOsApiClient(auth);
  const allowed = await actorCanMutateMasterData(client);
  if (!allowed) return { ok: false as const, error: DENIED };
  return { ok: true as const, client };
}

/**
 * Customer edits (name, contacts, phone, locations): the API decides with the customer resource
 * rule (owner, team lead, coverage with customer.edit, or data steward). No master_data.admin pre-check.
 */
async function customerClient() {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false as const, error: 'Su sesión venció. Vuelva a iniciar sesión.' };
  return { ok: true as const, client: createOsApiClient(auth) };
}

function revalidateCustomer(partyId: string) {
  revalidatePath('/clientes');
  revalidatePath(partyHref(partyId));
  revalidatePath(`/clientes/${partyId}`, 'page');
}

function readPair(formData: FormData): { latitude?: number; longitude?: number; clear: boolean } | { error: string } {
  const parsed = parseCoordinatePair(
    String(formData.get('latitude') ?? ''),
    String(formData.get('longitude') ?? ''),
  );
  if (!parsed.ok) return { error: parsed.error };
  const latText = String(formData.get('latitude') ?? '').trim();
  const lngText = String(formData.get('longitude') ?? '').trim();
  if (!latText && !lngText) return { clear: true };
  return { latitude: parsed.latitude, longitude: parsed.longitude, clear: false };
}

export async function createCustomerAction(formData: FormData): Promise<CreateRedirectResult> {
  const searchedQuery = String(formData.get('searchedQuery') ?? '');
  const confirmDistinct = formData.get('confirmDistinct') === 'on';
  const hasMoreMatches = formData.get('hasMoreMatches') === 'true';
  const gate = createCustomerSearchGate({ searchedQuery, confirmDistinct, hasMoreMatches });
  if (!gate.ok) return gate;

  const displayName = String(formData.get('displayName') ?? '').trim();
  const partyKind = String(formData.get('partyKind') ?? '').trim();
  const legalName = String(formData.get('legalName') ?? '').trim();
  if (!displayName) return { ok: false, error: 'Ingrese el nombre del cliente.' };
  if (!(PARTY_KINDS_FOR_CUSTOMER as readonly string[]).includes(partyKind)) {
    return { ok: false, error: 'Seleccione si es empresa o persona.' };
  }

  const session = await adminClient();
  if (!session.ok) return session;

  const payload = buildCreateCustomerPayload({
    displayName,
    partyKind: partyKind as 'organization' | 'person',
    legalName,
  });

  try {
    const result = await session.client.executePartyCommand('CreateParty', payload, createId());
    const partyId = String(result.data.partyId ?? '').trim();
    if (!partyId) {
      return { ok: false, error: 'El cliente se creó, pero no se pudo abrir la ficha. Búsquelo en Clientes.' };
    }
    revalidateCustomer(partyId);
    revalidatePath(clientesSearchHref({ q: searchedQuery.trim() }));
    return { ok: true, redirectTo: await redirectKeepingDataMode(partyHref(partyId), formData) };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function updateCustomerAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const displayName = String(formData.get('displayName') ?? '').trim();
  // The form carries legalName only for a viewer who may edit it; otherwise it is omitted and unchanged.
  const sendsLegalName = formData.has('legalName');
  const legalName = sendsLegalName ? String(formData.get('legalName') ?? '').trim() : undefined;
  const expectedVersion = Number(formData.get('expectedVersion'));
  if (!partyId || !displayName) return { ok: false, error: 'Ingrese el nombre del cliente.' };
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return { ok: false, error: 'No se pudo guardar. Actualice la página e intente de nuevo.' };
  }
  const changeReason = String(formData.get('changeReason') ?? '').trim();
  const reasonError = partyEditReasonError({
    previous: {
      displayName: String(formData.get('previousDisplayName') ?? ''),
      legalName: sendsLegalName ? String(formData.get('previousLegalName') ?? '') || null : null,
    },
    displayName,
    legalName: sendsLegalName ? legalName || null : null,
    changeReason,
  });
  if (reasonError) return { ok: false, error: reasonError };

  const session = await customerClient();
  if (!session.ok) return session;

  const payload = buildUpdatePartyPayload({
    partyId,
    displayName,
    legalName,
    expectedVersion,
    changeReason,
  });

  try {
    const result = await session.client.executePartyCommand('UpdateParty', payload, createId());
    revalidateCustomer(partyId);
    return { ok: true, data: result.data };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function updateContactAction(formData: FormData): Promise<CommandActionResult> {
  const organizationPartyId = String(formData.get('organizationPartyId') ?? '').trim();
  const contactId = String(formData.get('contactId') ?? '').trim();
  const givenName = String(formData.get('givenName') ?? '').trim();
  const familyName = String(formData.get('familyName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  if (!organizationPartyId || !givenName || !familyName) {
    return { ok: false, error: 'Ingrese nombre y apellido del contacto.' };
  }
  if (email && !email.includes('@')) {
    return { ok: false, error: 'Revise el correo del contacto.' };
  }

  const country = String(formData.get('country') ?? '');
  const phone = contactId ? null : contactNumberFromForm(String(formData.get('phone') ?? ''), country);
  const whatsapp = contactId ? null : contactNumberFromForm(String(formData.get('whatsapp') ?? ''), country);
  if (phone && !phone.ok) return phone;
  if (whatsapp && !whatsapp.ok) return whatsapp;

  const session = await customerClient();
  if (!session.ok) return session;

  const payload = buildUpdateContactPayload({
    organizationPartyId,
    contactId,
    givenName,
    familyName,
    email,
    phone: phone?.value ?? null,
    whatsapp: whatsapp?.value ?? null,
    title: String(formData.get('title') ?? ''),
  });

  try {
    const result = await session.client.executePartyCommand('UpdateContact', payload, createId());
    revalidateCustomer(organizationPartyId);
    return { ok: true, data: result.data };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

function phoneFormInput(formData: FormData) {
  return {
    partyId: String(formData.get('partyId') ?? '').trim(),
    contactId: String(formData.get('contactId') ?? '').trim(),
    expectedVersion: Number(formData.get('expectedVersion')),
    channel: String(formData.get('channel') ?? 'phone'),
    reason: String(formData.get('reason') ?? ''),
    reasonNote: String(formData.get('reasonNote') ?? ''),
  };
}

export async function changeContactPhoneAction(formData: FormData): Promise<CommandActionResult> {
  const built = buildChangeContactEndpointPayload({
    ...phoneFormInput(formData),
    newNumber: String(formData.get('newPhone') ?? ''),
    country: String(formData.get('country') ?? ''),
    verificationMethod: String(formData.get('verificationMethod') ?? ''),
    evidenceNote: String(formData.get('evidenceNote') ?? ''),
  });
  if (!built.ok) return built;
  const session = await customerClient();
  if (!session.ok) return session;
  try {
    const result = await session.client.executePartyCommand('ChangeContactEndpoint', built.payload, createId());
    revalidateCustomer(String(built.payload.partyId));
    return { ok: true, data: result.data };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function retireContactPhoneAction(formData: FormData): Promise<CommandActionResult> {
  const built = buildRetireContactEndpointPayload(phoneFormInput(formData));
  if (!built.ok) return built;
  const session = await customerClient();
  if (!session.ok) return session;
  try {
    const result = await session.client.executePartyCommand('RetireContactEndpoint', built.payload, createId());
    revalidateCustomer(String(built.payload.partyId));
    return { ok: true, data: result.data };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function resolveContactIdentityReviewAction(formData: FormData): Promise<CommandActionResult> {
  const built = buildResolveContactIdentityReviewPayload({
    partyId: String(formData.get('partyId') ?? '').trim(),
    contactId: String(formData.get('contactId') ?? '').trim(),
    expectedVersion: Number(formData.get('expectedVersion')),
    channel: String(formData.get('channel') ?? ''),
    decision: String(formData.get('decision') ?? ''),
    verificationMethod: String(formData.get('verificationMethod') ?? ''),
    note: String(formData.get('note') ?? ''),
  });
  if (!built.ok) return built;
  const session = await customerClient();
  if (!session.ok) return session;
  try {
    const result = await session.client.executePartyCommand('ResolveContactIdentityReview', built.payload, createId());
    revalidateCustomer(String(built.payload.partyId));
    return { ok: true, data: result.data };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

/** T03 C6: the full number is returned to the caller once and not revalidated into any page. */
export async function revealContactEndpointAction(
  formData: FormData,
): Promise<{ ok: true; number: string } | { ok: false; error: string }> {
  const built = buildRevealContactEndpointPayload({
    partyId: String(formData.get('partyId') ?? '').trim(),
    contactId: String(formData.get('contactId') ?? '').trim(),
    associationId: String(formData.get('associationId') ?? '').trim(),
    justification: String(formData.get('justification') ?? ''),
  });
  if (!built.ok) return built;
  const session = await customerClient();
  if (!session.ok) return session;
  try {
    const result = await session.client.executePartyCommand('RevealContactEndpoint', built.payload, createId());
    const number = typeof result.data.number === 'string' ? result.data.number : '';
    if (!number) return { ok: false, error: 'No se pudo mostrar el número.' };
    return { ok: true, number };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function createLocationAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const label = String(formData.get('label') ?? '').trim();
  if (!partyId || !label) return { ok: false, error: 'Ingrese un nombre para la ubicación.' };

  const coords = readPair(formData);
  if ('error' in coords) return { ok: false, error: coords.error };
  const provenance = preserveProvenanceUrl(String(formData.get('provenanceUrl') ?? ''));
  if (!provenance.ok) return { ok: false, error: provenance.error };

  const session = await customerClient();
  if (!session.ok) return session;

  const payload = buildCreateLocationPayload({
    partyId,
    label,
    addressText: String(formData.get('addressText') ?? ''),
    latitude: coords.latitude,
    longitude: coords.longitude,
    provenanceUrl: provenance.url,
  });

  try {
    const result = await session.client.executeLocationCommand('CreateLocation', payload, createId());
    revalidateCustomer(partyId);
    return { ok: true, data: result.data };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function updateLocationAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const locationId = String(formData.get('locationId') ?? '').trim();
  const label = String(formData.get('label') ?? '').trim();
  const expectedVersion = Number(formData.get('expectedVersion'));
  if (!partyId || !locationId || !label) {
    return { ok: false, error: 'Ingrese un nombre para la ubicación.' };
  }
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return { ok: false, error: 'No se pudo guardar. Actualice la página e intente de nuevo.' };
  }

  const coords = readPair(formData);
  if ('error' in coords) return { ok: false, error: coords.error };
  const provenance = preserveProvenanceUrl(String(formData.get('provenanceUrl') ?? ''));
  if (!provenance.ok) return { ok: false, error: provenance.error };

  const addressText = String(formData.get('addressText') ?? '').trim();
  const session = await customerClient();
  if (!session.ok) return session;

  const payload = buildUpdateLocationPayload({
    locationId,
    label,
    addressText: addressText || null,
    latitude: coords.clear ? null : (coords.latitude ?? null),
    longitude: coords.clear ? null : (coords.longitude ?? null),
    provenanceUrl: provenance.url ?? null,
    expectedVersion,
  });

  try {
    const result = await session.client.executeLocationCommand('UpdateLocation', payload, createId());
    revalidateCustomer(partyId);
    return { ok: true, data: result.data };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function setContactFollowupPreferenceAction(formData: FormData): Promise<CommandActionResult> {
  const built = buildSetFollowupPreferencePayload({
    partyId: String(formData.get('partyId') ?? '').trim(),
    contactId: String(formData.get('contactId') ?? '').trim(),
    channel: String(formData.get('channel') ?? ''),
    preference: String(formData.get('preference') ?? ''),
    expectedVersion: Number(formData.get('expectedVersion')),
    identityConfirmed: formData.get('identityConfirmed') === 'on',
    note: String(formData.get('note') ?? ''),
  });
  if (!built.ok) return built;
  const session = await customerClient();
  if (!session.ok) return session;
  try {
    const result = await session.client.executePartyCommand('SetContactFollowupPreference', built.payload, createId());
    revalidateCustomer(String(built.payload.partyId));
    return { ok: true, data: result.data };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function endContactRelationshipAction(formData: FormData): Promise<CommandActionResult> {
  const built = buildEndContactRelationshipPayload({
    partyId: String(formData.get('partyId') ?? '').trim(),
    contactId: String(formData.get('contactId') ?? '').trim(),
    expectedVersion: Number(formData.get('expectedVersion')),
    reason: String(formData.get('reason') ?? ''),
    reasonNote: String(formData.get('reasonNote') ?? ''),
    endedOn: String(formData.get('endedOn') ?? ''),
  });
  if (!built.ok) return built;
  const session = await customerClient();
  if (!session.ok) return session;
  try {
    const result = await session.client.executePartyCommand('EndContactRelationship', built.payload, createId());
    revalidateCustomer(String(built.payload.partyId));
    return { ok: true, data: result.data };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function resolveImportPhoneAction(formData: FormData): Promise<CommandActionResult> {
  const built = buildResolveImportPhonePayload({
    importBatchId: String(formData.get('importBatchId') ?? '').trim(),
    rowIndex: Number(formData.get('rowIndex')),
    valueId: String(formData.get('valueId') ?? '').trim(),
    expectedVersion: Number(formData.get('expectedVersion')),
    decision: String(formData.get('decision') ?? ''),
    correctedNumber: String(formData.get('correctedNumber') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });
  if (!built.ok) return built;
  const session = await adminClient();
  if (!session.ok) return session;
  try {
    const result = await session.client.executeImportCommand('ResolveImportPhoneValue', built.payload, createId());
    revalidatePath('/clientes');
    return { ok: true, data: result.data as unknown as Record<string, unknown> };
  } catch (err) {
    return { ok: false, error: importPhoneCommandMessage(err) };
  }
}

export async function executeClientImportAction(formData: FormData): Promise<CommandActionResult> {
  const importBatchId = String(formData.get('importBatchId') ?? '').trim();
  if (!importBatchId) return { ok: false, error: 'Indique el lote de importación.' };
  const session = await adminClient();
  if (!session.ok) return session;
  try {
    const result = await session.client.executeImportCommand('ExecuteClientImport', { importBatchId }, createId());
    revalidatePath('/clientes');
    return { ok: true, data: result.data as unknown as Record<string, unknown> };
  } catch (err) {
    return { ok: false, error: importPhoneCommandMessage(err) };
  }
}

export async function deactivateLocationAction(formData: FormData): Promise<CommandActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const locationId = String(formData.get('locationId') ?? '').trim();
  if (!partyId || !locationId) return { ok: false, error: 'No se pudo desactivar esta ubicación.' };

  const session = await customerClient();
  if (!session.ok) return session;

  const payload = buildDeactivateLocationPayload(locationId);
  try {
    const result = await session.client.executeLocationCommand('DeactivateLocation', payload, createId());
    revalidateCustomer(partyId);
    return { ok: true, data: result.data };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}
