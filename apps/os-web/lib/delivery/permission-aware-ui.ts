import { canRecordDelivery, canRecordWarehouseOutbound } from '@isalwa/os-contracts';

/** View As narrows the lens. It does not elevate the signed-in member. */
export function deliveryPresentationScopes(input: {
  grantedScopes: readonly string[];
  evaluationActive: boolean;
  presentationScopes: readonly string[];
}): readonly string[] {
  return input.evaluationActive ? input.presentationScopes : input.grantedScopes;
}

export function canShowDeliveryNotePdf(scopes: readonly string[]): boolean {
  return canRecordDelivery(scopes);
}

export function canOperateEntregaDesk(scopes: readonly string[]): boolean {
  return canRecordDelivery(scopes) || canRecordWarehouseOutbound(scopes);
}

export function omitDeliveryNotePdfWithoutRecord<T extends { type: string }>(
  links: readonly T[],
  scopes: readonly string[],
): T[] {
  if (canRecordDelivery(scopes)) return [...links];
  return links.filter((link) => link.type !== 'delivery_note_pdf');
}
