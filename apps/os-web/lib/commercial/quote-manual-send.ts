export const QUOTE_MANUAL_SEND_COPY = {
  action: 'Registrar como enviada',
  section: 'Envío',
  pendingLabel: 'Registrando envío…',
  channel: 'Canal',
  channelWhatsapp: 'WhatsApp',
  channelOther: 'Otro',
  note: 'Nota',
  noteOptional: 'Opcional',
  disclaimer:
    'ISALWA registra el envío; no envía el mensaje desde aquí todavía.',
  successWhatsapp: 'Cotización registrada como enviada por WhatsApp',
  successOther: 'Cotización registrada como enviada por otro canal',
  followUpPrompt: '¿Cuándo quieres hacer seguimiento?',
  channelRequired: 'Seleccione el canal de envío.',
  quoteInvalid: 'Cotización no válida.',
} as const;

export function quoteManualSendHistoryLabel(channel: string | null | undefined): string {
  if (channel === 'whatsapp') return QUOTE_MANUAL_SEND_COPY.successWhatsapp;
  if (channel === 'otro') return QUOTE_MANUAL_SEND_COPY.successOther;
  return 'Cotización registrada como enviada';
}

export function canRecordQuoteManualSend(status: string): boolean {
  return status === 'submitted';
}
