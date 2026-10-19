import {
  CONTACT_ENDPOINT_CHANNELS,
  CONTACT_PHONE_CHANGE_REASONS,
  CONTACT_PHONE_COUNTRIES,
  CONTACT_PHONE_VERIFICATION_METHODS,
  normalizeContactNumber,
  type ContactNumberInput,
} from '@isalwa/os-contracts';

/** The only country the forms offer today; the payload always names it (T03 C5). */
export const DEFAULT_CONTACT_PHONE_COUNTRY = CONTACT_PHONE_COUNTRIES[0];

type NumberResult = { ok: true; value: ContactNumberInput | null } | { ok: false; error: string };

/** Empty text is no number; anything else must be a valid number of the stated country. */
export function contactNumberFromForm(number: string | null | undefined, country: string | null | undefined): NumberResult {
  const text = number?.trim() ?? '';
  if (!text) return { ok: true, value: null };
  const chosen = country?.trim() || DEFAULT_CONTACT_PHONE_COUNTRY;
  if (!(CONTACT_PHONE_COUNTRIES as readonly string[]).includes(chosen) || !normalizeContactNumber({ country: chosen, number: text })) {
    return { ok: false, error: 'Revise el número: debe ser un número boliviano válido.' };
  }
  return { ok: true, value: { country: chosen as ContactNumberInput['country'], number: text } };
}

/** A2 §58 wording. None of these is "a new sender says they are X". */
export const CONTACT_PHONE_REASON_LABELS: Record<string, string> = {
  number_changed: 'Cambio de número',
  entry_error: 'Error de registro',
  no_longer_belongs: 'Número ya no pertenece al contacto',
  other: 'Otro',
};

export const CONTACT_PHONE_VERIFICATION_LABELS: Record<string, string> = {
  known_contact_confirmation: 'Confirmación por contacto conocido',
  in_person: 'Confirmación presencial',
  previously_verified_channel: 'Confirmación por canal previamente verificado',
  owner_review: 'Revisión de responsable',
};

export const CONTACT_PHONE_REASON_OPTIONS = CONTACT_PHONE_CHANGE_REASONS.map((value) => ({
  value,
  label: CONTACT_PHONE_REASON_LABELS[value]!,
}));

export const CONTACT_PHONE_VERIFICATION_OPTIONS = CONTACT_PHONE_VERIFICATION_METHODS.map((value) => ({
  value,
  label: CONTACT_PHONE_VERIFICATION_LABELS[value]!,
}));

type PhoneFormInput = {
  partyId: string;
  contactId: string;
  expectedVersion: number;
  channel: string;
  reason: string;
  reasonNote?: string | null;
};

type PhoneFormResult = { ok: true; payload: Record<string, unknown> } | { ok: false; error: string };

function basePayload(input: PhoneFormInput): PhoneFormResult {
  if (!(CONTACT_PHONE_CHANGE_REASONS as readonly string[]).includes(input.reason)) {
    return { ok: false, error: 'Elija el motivo.' };
  }
  const reasonNote = input.reasonNote?.trim() ?? '';
  if (input.reason === 'other' && !reasonNote) return { ok: false, error: 'Describa el motivo.' };
  if (!(CONTACT_ENDPOINT_CHANNELS as readonly string[]).includes(input.channel)) {
    return { ok: false, error: 'No se pudo guardar. Actualice la página e intente de nuevo.' };
  }
  if (!input.partyId || !input.contactId || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
    return { ok: false, error: 'No se pudo guardar. Actualice la página e intente de nuevo.' };
  }
  return {
    ok: true,
    payload: {
      partyId: input.partyId,
      contactId: input.contactId,
      expectedVersion: input.expectedVersion,
      channel: input.channel,
      reason: input.reason,
      ...(reasonNote ? { reasonNote } : {}),
    },
  };
}

export function buildChangeContactEndpointPayload(
  input: PhoneFormInput & { newNumber: string; country?: string | null; verificationMethod: string; evidenceNote?: string | null },
): PhoneFormResult {
  const base = basePayload(input);
  if (!base.ok) return base;
  const newNumber = contactNumberFromForm(input.newNumber, input.country);
  if (!newNumber.ok) return newNumber;
  if (!newNumber.value) return { ok: false, error: 'Ingrese el número nuevo.' };
  if (!(CONTACT_PHONE_VERIFICATION_METHODS as readonly string[]).includes(input.verificationMethod)) {
    return { ok: false, error: 'Elija cómo se verificó el número nuevo.' };
  }
  const evidenceNote = input.evidenceNote?.trim() ?? '';
  return {
    ok: true,
    payload: {
      ...base.payload,
      newNumber: newNumber.value,
      verificationMethod: input.verificationMethod,
      ...(evidenceNote ? { evidenceNote } : {}),
    },
  };
}

/** T03 C6: reveal one number from the contact's history, for a stated reason (10–500 characters). */
export function buildRevealContactEndpointPayload(input: {
  partyId: string;
  contactId: string;
  associationId: string;
  justification: string;
}): PhoneFormResult {
  const justification = input.justification.trim();
  if (justification.length < 10 || justification.length > 500) {
    return { ok: false, error: 'Explique por qué necesita ver el número completo (entre 10 y 500 caracteres).' };
  }
  if (!input.partyId || !input.contactId || !input.associationId) {
    return { ok: false, error: 'No se pudo mostrar el número. Actualice la página e intente de nuevo.' };
  }
  return {
    ok: true,
    payload: { partyId: input.partyId, contactId: input.contactId, associationId: input.associationId, justification },
  };
}

export function buildRetireContactEndpointPayload(input: PhoneFormInput): PhoneFormResult {
  return basePayload(input);
}
