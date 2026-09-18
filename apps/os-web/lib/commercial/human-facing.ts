/**
 * Display-only labels. Stored ids and technical refs stay unchanged.
 */

import { isOffCatalogProductRef, SPECIAL_ITEM_LABEL } from './product-picker';

/** Provisional pilot document refs. Not a fiscal series. */
export const PILOT_DELIVERY_NOTE_REF_PREFIX = 'NE-PILOT-';

export const DELIVERY_NOTE_DISPLAY_NAME = 'Nota de entrega';

const PILOT_REF_PATTERN = /NE-PILOT-[A-Za-z0-9_-]+/g;
const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

export function isPilotDeliveryNoteRef(ref: string | null | undefined): boolean {
  return Boolean(ref?.trim().startsWith(PILOT_DELIVERY_NOTE_REF_PREFIX));
}

function humanPedidoNumber(orderNumber: string | null | undefined): string | null {
  const value = orderNumber?.trim() ?? '';
  if (!value || isPilotDeliveryNoteRef(value) || ULID_PATTERN.test(value)) return null;
  return value;
}

/**
 * Human label for a nota. NE-PILOT refs never appear.
 * Compact form uses the existing pedido number when one is already known.
 */
export function presentDeliveryNoteLabel(input: {
  internalDocumentRef?: string | null;
  orderNumber?: string | null;
}): string {
  const ref = input.internalDocumentRef?.trim() ?? '';
  if (!ref || isPilotDeliveryNoteRef(ref)) {
    const order = humanPedidoNumber(input.orderNumber);
    return order ? `${DELIVERY_NOTE_DISPLAY_NAME} · Pedido ${order}` : DELIVERY_NOTE_DISPLAY_NAME;
  }
  return `${DELIVERY_NOTE_DISPLAY_NAME} ${ref}`;
}

/** Visible reference column. Pilot refs become the display label; other refs stay as stored. */
export function presentDeliveryNoteReference(input: {
  internalDocumentRef?: string | null;
  orderNumber?: string | null;
}): string {
  const ref = input.internalDocumentRef?.trim() ?? '';
  if (!ref || isPilotDeliveryNoteRef(ref)) return presentDeliveryNoteLabel(input);
  return ref;
}

/** Replace pilot refs inside already-composed copy. Does not rewrite stored facts. */
export function scrubPilotDeliveryNoteRefs(
  text: string,
  orderNumber?: string | null,
): string {
  if (!text.includes(PILOT_DELIVERY_NOTE_REF_PREFIX)) return text;
  const replacement = presentDeliveryNoteLabel({
    internalDocumentRef: `${PILOT_DELIVERY_NOTE_REF_PREFIX}x`,
    orderNumber,
  });
  return text.replace(PILOT_REF_PATTERN, replacement);
}

/**
 * Pedido line reference shown to people.
 * `off-catalog:` stays stored; the screen shows the existing special-item label.
 */
export function presentProductRef(productRef: string | null | undefined): string | null {
  if (!productRef?.trim()) return null;
  if (isOffCatalogProductRef(productRef)) return SPECIAL_ITEM_LABEL;
  return productRef;
}
