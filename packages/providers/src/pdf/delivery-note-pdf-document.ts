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
  /** Provisional pilot ref, e.g. NE-PILOT-<id>. Kept in the payload. Not shown when it is a pilot ref. */
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

export const PILOT_DELIVERY_NOTE_REF_PREFIX = 'NE-PILOT-';

const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

export function isPilotInternalDocumentRef(ref: string | null | undefined): boolean {
  return Boolean(ref?.trim().startsWith(PILOT_DELIVERY_NOTE_REF_PREFIX));
}

function humanPedidoNumber(orderRef: string | null | undefined): string | null {
  const value = orderRef?.trim() ?? '';
  if (!value || isPilotInternalDocumentRef(value) || ULID_PATTERN.test(value)) return null;
  return value;
}

/**
 * Human-visible PDF reference. Pilot refs stay on internalDocumentRef and are not painted.
 * Does not invent a fiscal series.
 */
export function deliveryNotePdfVisibleReference(doc: {
  internalDocumentRef: string;
  orderRef?: string | null;
  displayDocumentNumber?: string | null;
}): string {
  if (
    isPilotInternalDocumentRef(doc.internalDocumentRef) ||
    isPilotInternalDocumentRef(doc.displayDocumentNumber)
  ) {
    const order = humanPedidoNumber(doc.orderRef);
    return order ? `Nota de entrega · Pedido ${order}` : 'Nota de entrega';
  }
  return doc.internalDocumentRef;
}

export function deliveryNotePdfFooterLabel(doc: {
  internalDocumentRef: string;
  orderRef?: string | null;
  displayDocumentNumber?: string | null;
}): string {
  if (isPilotInternalDocumentRef(doc.internalDocumentRef)) {
    return deliveryNotePdfVisibleReference(doc);
  }
  return `Nota de entrega ${doc.internalDocumentRef} · provisional`;
}

export function sanitizeDeliveryNotePdfFilename(internalDocumentRef: string): string {
  const source = isPilotInternalDocumentRef(internalDocumentRef) ? 'documento' : internalDocumentRef;
  const safe = source
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^\.+/, '')
    .replace(/^_+|_+$/g, '');
  return `Nota-Entrega-${safe || 'documento'}.pdf`;
}
