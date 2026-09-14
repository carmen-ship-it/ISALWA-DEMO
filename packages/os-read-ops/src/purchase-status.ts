/**
 * Business labels already named by Isa. Do not invent others.
 * Stored keys are in packages/os-contracts purchase-request.ts.
 * Cancelado is a stop, not a happy-path step.
 * Legacy keys map forward only through that existing map.
 */

export const PURCHASE_STATUS_LABELS = {
  solicitado: 'Solicitado',
  cotizandose: 'Cotizándose',
  pedido_preparandose: 'Pedido y Preparándose',
  entregado: 'Entregado',
  cancelled: 'Cancelado',
} as const;

export const PURCHASE_HAPPY_PATH_LABELS = [
  'Solicitado',
  'Cotizándose',
  'Pedido y Preparándose',
  'Entregado',
] as const;

export const PURCHASE_STOP_LABEL = 'Cancelado' as const;

const HAPPY_PATH_KEYS = [
  'solicitado',
  'cotizandose',
  'pedido_preparandose',
  'entregado',
] as const;

const LEGACY_STATUS_MAP = {
  requested: 'solicitado',
  in_progress: 'cotizandose',
  received: 'entregado',
  cancelled: 'cancelled',
} as const;

export type PurchaseStatusFact = {
  storedStatus: string;
  statusKey: keyof typeof PURCHASE_STATUS_LABELS | null;
  label: string | null;
  isStop: boolean;
  isHappyPath: boolean;
  labelInvented: false;
};

export function purchaseStatusFact(stored: string): PurchaseStatusFact {
  const raw = stored.trim();
  const mapped =
    raw in LEGACY_STATUS_MAP ? LEGACY_STATUS_MAP[raw as keyof typeof LEGACY_STATUS_MAP] : raw;
  if (!(mapped in PURCHASE_STATUS_LABELS)) {
    return {
      storedStatus: raw,
      statusKey: null,
      label: null,
      isStop: false,
      isHappyPath: false,
      labelInvented: false,
    };
  }
  const statusKey = mapped as keyof typeof PURCHASE_STATUS_LABELS;
  return {
    storedStatus: raw,
    statusKey,
    label: PURCHASE_STATUS_LABELS[statusKey],
    isStop: statusKey === 'cancelled',
    isHappyPath: (HAPPY_PATH_KEYS as readonly string[]).includes(statusKey),
    labelInvented: false,
  };
}
