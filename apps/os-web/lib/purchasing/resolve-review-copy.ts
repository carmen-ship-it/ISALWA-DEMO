export const PURCHASING_CONCLUSIONS = [
  'No requiere acción de Compras',
  'Requiere gestión de compra externa',
  'Falta información',
] as const;

export type PurchasingConclusion = (typeof PURCHASING_CONCLUSIONS)[number];

export function purchasingResultCopy(conclusion: string): string {
  if (conclusion === 'Requiere gestión de compra externa') {
    return 'Requiere gestión de compra fuera de ISALWA.';
  }
  return conclusion;
}

export function comprasResultMarker(orderId: string): string {
  return `[[compras-result:${orderId.trim()}]]`;
}
