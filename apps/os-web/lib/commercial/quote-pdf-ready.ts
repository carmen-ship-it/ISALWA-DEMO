/**
 * Quote PDF is generated on demand from the durable quote record.
 * Draft quotes are not yet "ready" for the primary download CTA.
 */

export function isQuotePdfReady(status: string): boolean {
  return status === 'submitted' || status === 'accepted' || status === 'cancelled';
}

export const QUOTE_PDF_COPY = {
  download: 'Descargar PDF',
  view: 'Ver PDF',
  preparing: 'Preparando…',
  notReady:
    'Presente la cotización para ver y descargar el PDF. ISALWA no envía WhatsApp ni correo.',
  available: 'PDF disponible',
  documento: 'Documento',
  manualSend:
    'Descargue la cotización y envíela por su canal habitual. Después, regístrela como enviada para continuar el seguimiento.',
} as const;

export function quotePdfDownloadFilename(quoteNumber: string): string {
  const safe = quoteNumber
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^\.+/, '')
    .replace(/^_+|_+$/g, '');
  return `Cotizacion-${safe || 'documento'}.pdf`;
}
