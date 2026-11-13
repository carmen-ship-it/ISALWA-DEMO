import { CORRECTION_FIELDS, type CorrectionField, type CorrectionRequestView } from '@isalwa/os-contracts';
import { OsApiError } from '@/lib/api/os-api-errors';
import { mapCommandError } from '@/lib/commercial/command-errors';

export const CORRECTION_FIELD_LABELS: Record<CorrectionField, string> = {
  display_name: 'Nombre',
  legal_name: 'Razón social',
  fiscal_identity: 'Identidad fiscal',
  contact_name: 'Nombre del contacto',
  contact_email: 'Correo del contacto',
  contact_phone: 'Teléfono del contacto',
  contact_whatsapp: 'WhatsApp del contacto',
  location_address: 'Dirección',
  location_city: 'Ciudad',
  other: 'Otro dato del cliente',
};

const CONTACT_FIELDS = new Set<CorrectionField>(['contact_name', 'contact_email', 'contact_phone', 'contact_whatsapp']);
const LOCATION_FIELDS = new Set<CorrectionField>(['location_address', 'location_city']);

export const CORRECTION_STATE_LABELS: Record<CorrectionRequestView['state'], string> = {
  pending: 'Pendiente',
  in_review: 'En revisión',
  applied: 'Resuelta',
  rejected: 'Rechazada',
};

export const CORRECTION_ATTENTION_LABELS = {
  unassigned: 'Sin responsable',
  owner_lacks_authority: 'El responsable ya no puede aplicar el cambio',
} as const;

export function correctionFieldNeedsContact(field: string): boolean {
  return CONTACT_FIELDS.has(field as CorrectionField);
}

export function correctionFieldNeedsLocation(field: string): boolean {
  return LOCATION_FIELDS.has(field as CorrectionField);
}

export function buildReportCorrectionPayload(input: {
  description: string;
  partyId: string;
  field: string;
  proposedValue: string;
  source: string;
  contactId?: string | null;
  locationId?: string | null;
}): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
  const description = input.description.trim();
  const proposedValue = input.proposedValue.trim();
  if (!description) return { ok: false, error: 'Describa la solicitud.' };
  if (!(CORRECTION_FIELDS as readonly string[]).includes(input.field)) return { ok: false, error: 'Elija el dato.' };
  if (!proposedValue || proposedValue.length > 500) return { ok: false, error: 'Escriba el valor propuesto (hasta 500 caracteres).' };
  if (input.source !== 'customer' && input.source !== 'staff' && input.source !== 'document') {
    return { ok: false, error: 'Elija el origen.' };
  }
  const contactId = input.contactId?.trim() ?? '';
  const locationId = input.locationId?.trim() ?? '';
  if (correctionFieldNeedsContact(input.field) && !contactId) return { ok: false, error: 'Elija el contacto.' };
  if (correctionFieldNeedsLocation(input.field) && !locationId) return { ok: false, error: 'Elija la ubicación.' };
  if (!input.partyId) return { ok: false, error: 'No se pudo guardar. Actualice la página e intente de nuevo.' };
  return {
    ok: true,
    payload: {
      description,
      title: 'Corrección de datos del cliente',
      references: [{ referenceType: 'party', referenceId: input.partyId }],
      correction: {
        partyId: input.partyId,
        field: input.field,
        proposedValue,
        source: input.source,
        ...(contactId ? { contactId } : {}),
        ...(locationId ? { locationId } : {}),
      },
    },
  };
}

export function buildResolveCorrectionPayload(input: {
  issueId: string;
  expectedVersion: number;
  decision: string;
  eventId?: string | null;
  reason: string;
  differenceExplanation?: string | null;
}): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
  const reason = input.reason.trim();
  if (reason.length < 10 || reason.length > 500) return { ok: false, error: 'Escriba el motivo (entre 10 y 500 caracteres).' };
  if (input.decision !== 'applied' && input.decision !== 'rejected') return { ok: false, error: 'Elija Resuelta o Rechazada.' };
  const eventId = input.eventId?.trim() ?? '';
  if (input.decision === 'applied' && !eventId) return { ok: false, error: 'Elija el cambio que ya se hizo en la ficha.' };
  const differenceExplanation = input.differenceExplanation?.trim() ?? '';
  if (input.decision === 'applied' && differenceExplanation && (differenceExplanation.length < 10 || differenceExplanation.length > 500)) {
    return { ok: false, error: 'La explicación de la diferencia debe tener entre 10 y 500 caracteres.' };
  }
  if (!input.issueId || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
    return { ok: false, error: 'No se pudo guardar. Actualice la página e intente de nuevo.' };
  }
  return {
    ok: true,
    payload: {
      issueId: input.issueId,
      expectedVersion: input.expectedVersion,
      resolution: reason,
      correction: {
        decision: input.decision,
        reason,
        ...(input.decision === 'applied' ? { appliedEventId: eventId } : {}),
        ...(input.decision === 'applied' && differenceExplanation ? { differenceExplanation } : {}),
      },
    },
  };
}

export function correctionCommandMessage(err: unknown): { error: string; code?: 'CORRECTION_VALUE_DIFFERS' | 'CORRECTION_EVIDENCE_INVALID' } {
  if (err instanceof OsApiError && err.code === 'CORRECTION_VALUE_DIFFERS') {
    return { error: 'El valor registrado difiere de lo solicitado. Explique la diferencia para continuar.', code: 'CORRECTION_VALUE_DIFFERS' };
  }
  if (err instanceof OsApiError && err.code === 'CORRECTION_EVIDENCE_INVALID') {
    return { error: 'El cambio no corresponde a la solicitud.', code: 'CORRECTION_EVIDENCE_INVALID' };
  }
  return { error: mapCommandError(err) };
}
