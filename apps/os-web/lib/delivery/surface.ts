export type EntregaSurfaceStatus = 'empty' | 'loading' | 'error' | 'permission' | 'ready';

export function resolveEntregaSurface(input: {
  organizationId?: string | null;
  denied?: boolean;
  failed?: boolean;
  warehouseExitCount: number;
  deliveryCount: number;
}): EntregaSurfaceStatus {
  const organizationId = input.organizationId?.trim() ?? '';
  if (!organizationId || input.denied) return 'permission';
  if (input.failed) return 'error';
  if (input.warehouseExitCount === 0 && input.deliveryCount === 0) return 'empty';
  return 'ready';
}

export type EntregaHistoryPanelStatus =
  | 'ready'
  | 'error'
  | 'permission'
  | 'loading'
  | 'history-withheld';

/**
 * A member who can record nota, salida, or entrega must not see a denial
 * for the company history list. That list is a separate read.
 */
export function resolveEntregaHistoryPanel(input: {
  surfaceStatus: EntregaSurfaceStatus;
  fulfillmentReadDenied: boolean;
  canOperateDesk: boolean;
}): EntregaHistoryPanelStatus {
  if (input.surfaceStatus === 'loading') return 'loading';
  if (input.surfaceStatus === 'error') return 'error';
  if (input.fulfillmentReadDenied && input.canOperateDesk) return 'history-withheld';
  if (input.surfaceStatus === 'permission') return 'permission';
  return 'ready';
}
