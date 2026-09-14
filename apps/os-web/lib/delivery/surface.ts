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
