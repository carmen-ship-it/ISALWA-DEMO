export const PURCHASING_CONCLUSIONS = [
  'No requiere acción de Compras',
  'Requiere gestión de compra externa',
  'Falta información',
] as const;

export type PurchasingConclusion = (typeof PURCHASING_CONCLUSIONS)[number];

/** Recorded with the external-Compras outcome. Already approved; not a new decision. */
export const PURCHASING_NO_PURCHASE_ORDER = 'No se creó una orden de compra.';

export function purchasingResultCopy(conclusion: string): string {
  if (conclusion === 'Requiere gestión de compra externa') {
    return `Requiere gestión de compra fuera de ISALWA. ${PURCHASING_NO_PURCHASE_ORDER}`;
  }
  return conclusion;
}

export const PURCHASING_RESULT_TITLE = 'Resultado de Compras recibido';
export const PURCHASING_RESULT_STATUS = 'Revisar resultado';
export const PURCHASING_RESULT_ORDER_LINK = 'Ver pedido';
export const PURCHASING_REPEAT_REQUEST = 'Solicitar nueva revisión de Compras';

export function comprasResultMarker(orderId: string): string {
  return `[[compras-result:${orderId.trim()}]]`;
}

export function parseComprasResultOrderId(text: string | null | undefined): string | null {
  const match = text?.match(/\[\[compras-result:([^\]]+)\]\]/);
  const orderId = match?.[1]?.trim() ?? '';
  return orderId || null;
}

export function isPurchasingResultWork(input: {
  title?: string | null;
  description?: string | null;
}): boolean {
  return Boolean(parseComprasResultOrderId(input.description) || parseComprasResultOrderId(input.title));
}
