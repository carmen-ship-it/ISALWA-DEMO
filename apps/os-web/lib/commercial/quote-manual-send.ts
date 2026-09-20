export const QUOTE_MANUAL_SEND_COPY = {
  action: 'Registrar como enviada',
  section: 'Envío',
  pendingLabel: 'Registrando envío…',
  channel: 'Canal',
  channelWhatsapp: 'WhatsApp',
  channelEmail: 'Email',
  channelOther: 'Otro',
  note: 'Nota',
  noteOptional: 'Opcional',
  disclaimer:
    'Descargue la cotización y envíela por su canal habitual. Después, regístrela como enviada para continuar el seguimiento.',
  successToast: 'Envío registrado.',
  successWhatsapp: 'Cotización registrada como enviada por WhatsApp',
  successEmail: 'Cotización registrada como enviada por Email',
  successOther: 'Cotización registrada como enviada por otro canal',
  followUpPrompt: 'Programe cuándo quiere volver a contactar al cliente.',
  followUpAction: 'Programar seguimiento',
  statusUnregistered: 'No registrado',
  statusWhatsapp: 'Enviada por WhatsApp',
  statusEmail: 'Enviada por Email',
  statusOther: 'Enviada por otro canal',
  channelRequired: 'Seleccione el canal de envío.',
  quoteInvalid: 'Cotización no válida.',
} as const;

export type QuoteManualSendUiChannel = 'whatsapp' | 'email' | 'otro';

export function quoteManualSendHistoryLabel(channel: string | null | undefined): string {
  if (channel === 'whatsapp') return QUOTE_MANUAL_SEND_COPY.successWhatsapp;
  if (channel === 'email') return QUOTE_MANUAL_SEND_COPY.successEmail;
  if (channel === 'otro') return QUOTE_MANUAL_SEND_COPY.successOther;
  return 'Cotización registrada como enviada';
}

export function canRecordQuoteManualSend(status: string): boolean {
  return status === 'submitted';
}
