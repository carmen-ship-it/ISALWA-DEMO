/** Structured input for a printable ISALWA Nota de Entrega PDF (provisional). */

export type DeliveryNotePdfLine = {
  quantity: number;
  description: string;
  unitLabel?: string | null;
};

export type DeliveryNotePdfDocument = {
  documentTitle: 'NOTA DE ENTREGA';
  brandName: string;
  organizationLegalName?: string | null;
  /** Provisional pilot ref, e.g. NE-PILOT-<id>. Not official. */
  internalDocumentRef: string;
  displayDocumentNumber?: string | null;
  issuedAtLabel: string;
  customerName: string;
  orderRef: string;
  recipient: string;
  deliveredBy: string;
  receivedBy: string | null;
  observations?: string | null;
  lines: DeliveryNotePdfLine[];
  numberingDisclaimer: string;
};

export type DeliveryNotePdfRenderInput = {
  internalDocumentRef: string;
  document: DeliveryNotePdfDocument;
};

export function formatDeliveryNotePdfDate(iso: string, timeZone = 'America/La_Paz'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('es-BO', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function sanitizeDeliveryNotePdfFilename(internalDocumentRef: string): string {
  const safe = internalDocumentRef
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^\.+/, '')
    .replace(/^_+|_+$/g, '');
  return `Nota-Entrega-${safe || 'documento'}.pdf`;
}
