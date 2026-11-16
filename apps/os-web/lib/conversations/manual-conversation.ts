import {
  ATTENTION_CHANNELS,
  ATTENTION_CHANNEL_LABELS,
  recordManualCustomerConversation,
  type AttentionChannel,
  type ManualCustomerConversation,
  type RecordCustomerConversationInput,
} from '@isalwa/os-contracts';

export { ATTENTION_CHANNELS, ATTENTION_CHANNEL_LABELS };
export type { AttentionChannel };

export const MANUAL_CONVERSATION_COPY = {
  title: 'Registrar atención',
  channelClosed:
    'WhatsApp no está conectado. El número corporativo del asesor de ventas todavía no está.',
  companyEntered: 'Esto es un registro que dejó la empresa.',
  boundary: 'Un mensaje es evidencia. No confirma un pago ni una entrega.',
  numberPending: 'Número corporativo pendiente',
  recorded: 'Atención guardada. WhatsApp sigue sin estar conectado.',
  recordedWithNextStep: 'Atención guardada. El siguiente paso quedó como compromiso.',
  partialTitle: 'Atención guardada, pero el siguiente paso no se creó.',
  partialBody:
    'La atención ya está registrada. Falta crear el compromiso del siguiente paso; no se perdió lo que escribió.',
  partialRetry: 'Reintentar siguiente paso',
  partialRetrying: 'Reintentando…',
  partialRecovered: 'Listo: el siguiente paso quedó como compromiso.',
  alreadyTaken: 'Otra persona ya tomó esta conversación.',
  sessionNeeded: 'Para anotarlo hace falta la sesión de la empresa.',
  customer: 'Cliente',
  customerHint: 'Seleccione el cliente de la empresa. No escriba un identificador a mano.',
  customerName: 'Nombre del cliente',
  contact: 'Contacto',
  channel: 'Canal',
  channelWhatsapp: ATTENTION_CHANNEL_LABELS.whatsapp,
  channelManual: ATTENTION_CHANNEL_LABELS.manual,
  channelHint: 'Es un registro de la empresa. No se envía ni se recibe nada por WhatsApp.',
  occurredAt: 'Fecha y hora',
  reason: 'Motivo',
  reasonHint: 'Por qué atendió al cliente. Es obligatorio.',
  summary: 'Nota',
  summaryHint: 'Qué se habló o se acordó. Es obligatoria.',
  moreDetails: 'Más detalles (opcional)',
  nextStepToggle: 'Agregar siguiente paso',
  nextStepDescription: 'Siguiente paso',
  nextStepDescriptionHint: 'Qué debe hacerse. Queda como compromiso de la persona responsable.',
  nextStepOwner: 'Responsable',
  nextStepOwnerHint: 'Busque a la persona del equipo que se encargará.',
  nextStepDate: 'Fecha del siguiente paso',
  nextStepIncomplete: 'Para guardar el siguiente paso indique qué hacer, quién lo hará y la fecha.',
  pasted: 'Texto pegado',
  pastedHint: 'Si copiaron un mensaje, péguenlo aquí. Sigue siendo evidencia.',
  opportunity: 'Oportunidad',
  quote: 'Cotización',
  order: 'Pedido',
  linksHint: 'Opcional. Elija un vínculo de la lista; no cambia ese registro.',
  linksNeedParty: 'Primero seleccione un cliente para ver oportunidades, cotizaciones o pedidos.',
  question: 'Pregunta del cliente',
  commitment: 'Posible compromiso',
  commitmentHint: 'Es un candidato. No queda cerrado.',
  requestedDate: 'Fecha que pidieron',
  requestedDateHint: 'No es una entrega confirmada.',
  nextAction: 'Siguiente paso',
  submit: 'Guardar atención',
  enteredBy: 'Lo anotó',
} as const;

export const MANUAL_CONVERSATION_ERRORS = {
  missing_tenant: 'Falta la empresa. No se anotó.',
  missing_customer: 'Hace falta el cliente. Sin cliente no queda la conversación.',
  missing_summary: 'Escriba la nota de la atención.',
  missing_reason: 'Escriba el motivo de la atención.',
  invalid_next_step: 'Revise el siguiente paso: qué hacer, responsable y fecha.',
  missing_entered_by: 'Falta quién lo anotó.',
  invalid_occurred_at: 'La fecha no es válida.',
  invalid_requested_date: 'La fecha que pidieron no es válida.',
  invalid_record: 'Revisa los datos. No se anotó.',
} as const;

/** Honest Spanish for the stable codes the next-step save can return. */
export function nextStepFailureMessage(code: string): string {
  switch (code) {
    case 'VALIDATION_FAILED':
      return 'La persona responsable no está activa o los datos del siguiente paso no son válidos.';
    case 'NOT_FOUND':
      return 'No se encontró el cliente o el registro del siguiente paso.';
    case 'PERMISSION_DENIED':
    case 'TENANT_FORBIDDEN':
    case 'ACCESS_REVOKED':
      return 'No tiene permiso para crear este compromiso.';
    case 'AUTH_REQUIRED':
      return 'Su sesión venció. Vuelva a iniciar sesión para reintentar.';
    case 'DATABASE_UNAVAILABLE':
      return 'El servicio no está disponible. Reintente en un momento.';
    default:
      return 'No se pudo crear el compromiso. Reintente.';
  }
}

export type ManualConversationDraft = {
  id: string;
  organizationId: string;
  customerId: string;
  customerLabel: string;
  contactLabel: string;
  channel: AttentionChannel | 'manual';
  occurredAt: string;
  enteredByMemberId: string | null;
  enteredByLabel: string;
  summary: string;
  /** Required for call, visit and in-person; the form asks for it on every channel. */
  reason?: string;
  pastedEvidence: string;
  opportunityId: string;
  quoteId: string;
  orderId: string;
  customerQuestion: string;
  commitmentCandidate: string;
  possibleRequestedDate: string;
  nextAction: string;
  /** All three parts, or none. Becomes a commitment through the existing command. */
  nextStep?: { description: string; ownerMemberId: string; dueDate: string } | null;
};

export function admitManualConversation(draft: ManualConversationDraft):
  | { ok: true; record: ManualCustomerConversation }
  | { ok: false; reason: keyof typeof MANUAL_CONVERSATION_ERRORS } {
  // A draft that carries `reason` comes from "Registrar atención": the reason is required there.
  if (draft.reason !== undefined && !draft.reason.trim()) {
    return { ok: false, reason: 'missing_reason' };
  }
  const input: RecordCustomerConversationInput = {
    id: draft.id,
    organizationId: draft.organizationId,
    customerId: draft.customerId,
    customerLabel: draft.customerLabel,
    contactLabel: draft.contactLabel.trim() || null,
    channel: draft.channel,
    occurredAt: draft.occurredAt,
    enteredByMemberId: draft.enteredByMemberId,
    enteredByLabel: draft.enteredByLabel,
    summary: draft.summary,
    reason: draft.reason?.trim() || null,
    pastedEvidence: draft.pastedEvidence.trim() || null,
    opportunityId: draft.opportunityId.trim() || null,
    quoteId: draft.quoteId.trim() || null,
    orderId: draft.orderId.trim() || null,
    customerQuestion: draft.customerQuestion.trim() || null,
    commitmentCandidate: draft.commitmentCandidate.trim() || null,
    possibleRequestedDate: draft.possibleRequestedDate.trim() || null,
    nextAction: draft.nextAction.trim() || null,
    nextStep: draft.nextStep ?? null,
  };
  const admitted = recordManualCustomerConversation(input);
  if (!admitted.ok) return admitted;
  return admitted;
}
