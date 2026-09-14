import {
  recordManualCustomerConversation,
  type ManualCustomerConversation,
  type RecordCustomerConversationInput,
} from '../../../../packages/os-contracts/src/customer-conversation';

export const MANUAL_CONVERSATION_COPY = {
  title: 'Registrar conversación con cliente',
  channelClosed:
    'WhatsApp no está conectado. El número corporativo del asesor de ventas todavía no está.',
  companyEntered: 'Esto es un registro que dejó la empresa.',
  boundary: 'Un mensaje es evidencia. No confirma un pago ni una entrega.',
  numberPending: 'Número corporativo pendiente',
  recorded: 'Quedó el registro de la empresa. WhatsApp sigue sin estar conectado.',
  sessionNeeded: 'Para anotarlo hace falta la sesión de la empresa.',
  customer: 'Cliente',
  customerHint: 'El registro del cliente en la empresa, no un número de WhatsApp.',
  customerName: 'Nombre del cliente',
  contact: 'Contacto',
  channel: 'Canal',
  channelWhatsapp: 'WhatsApp',
  channelManual: 'Otro registro',
  channelHint: 'El canal no está conectado. No se envía ni se recibe nada.',
  occurredAt: 'Cuándo ocurrió',
  summary: 'Resumen',
  pasted: 'Texto pegado',
  pastedHint: 'Si copiaron un mensaje, péguenlo aquí. Sigue siendo evidencia.',
  opportunity: 'Oportunidad',
  quote: 'Cotización',
  order: 'Pedido',
  linksHint: 'Opcional. Anotar el vínculo no cambia ese registro.',
  question: 'Pregunta del cliente',
  commitment: 'Posible compromiso',
  commitmentHint: 'Es un candidato. No queda cerrado.',
  requestedDate: 'Fecha que pidieron',
  requestedDateHint: 'No es una entrega confirmada.',
  nextAction: 'Siguiente paso',
  submit: 'Registrar conversación',
  enteredBy: 'Lo anotó',
} as const;

export const MANUAL_CONVERSATION_ERRORS = {
  missing_tenant: 'Falta la empresa. No se anotó.',
  missing_customer: 'Hace falta el cliente. Sin cliente no queda la conversación.',
  missing_summary: 'Escribe un resumen corto.',
  missing_entered_by: 'Falta quién lo anotó.',
  invalid_occurred_at: 'La fecha no es válida.',
  invalid_requested_date: 'La fecha que pidieron no es válida.',
  invalid_record: 'Revisa los datos. No se anotó.',
} as const;

export type ManualConversationDraft = {
  id: string;
  organizationId: string;
  customerId: string;
  customerLabel: string;
  contactLabel: string;
  channel: 'whatsapp' | 'manual';
  occurredAt: string;
  enteredByMemberId: string | null;
  enteredByLabel: string;
  summary: string;
  pastedEvidence: string;
  opportunityId: string;
  quoteId: string;
  orderId: string;
  customerQuestion: string;
  commitmentCandidate: string;
  possibleRequestedDate: string;
  nextAction: string;
};

export function admitManualConversation(draft: ManualConversationDraft):
  | { ok: true; record: ManualCustomerConversation }
  | { ok: false; reason: keyof typeof MANUAL_CONVERSATION_ERRORS } {
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
    pastedEvidence: draft.pastedEvidence.trim() || null,
    opportunityId: draft.opportunityId.trim() || null,
    quoteId: draft.quoteId.trim() || null,
    orderId: draft.orderId.trim() || null,
    customerQuestion: draft.customerQuestion.trim() || null,
    commitmentCandidate: draft.commitmentCandidate.trim() || null,
    possibleRequestedDate: draft.possibleRequestedDate.trim() || null,
    nextAction: draft.nextAction.trim() || null,
  };
  const admitted = recordManualCustomerConversation(input);
  if (!admitted.ok) return admitted;
  return admitted;
}
