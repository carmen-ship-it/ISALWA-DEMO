import {
  CONTACT_PHONE_CHANGE_REASONS,
  CONTACT_PHONE_VERIFICATION_METHODS,
} from '@isalwa/os-contracts';

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
    },
  };
}

export function buildChangeContactPhonePayload(
  input: PhoneFormInput & { newPhone: string; verificationMethod: string; evidenceNote?: string | null },
): PhoneFormResult {
  const base = basePayload(input);
  if (!base.ok) return base;
  const newPhone = input.newPhone.trim();
  if (!newPhone) return { ok: false, error: 'Ingrese el número nuevo.' };
  if (!(CONTACT_PHONE_VERIFICATION_METHODS as readonly string[]).includes(input.verificationMethod)) {
    return { ok: false, error: 'Elija cómo se verificó el número nuevo.' };
  }
  const evidenceNote = input.evidenceNote?.trim() ?? '';
  return {
    ok: true,
    payload: {
      ...base.payload,
      newPhone,
      verificationMethod: input.verificationMethod,
      ...(evidenceNote ? { evidenceNote } : {}),
    },
  };
}

export function buildRetireContactPhonePayload(input: PhoneFormInput): PhoneFormResult {
  return basePayload(input);
}
