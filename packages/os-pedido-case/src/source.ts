/** Source states for one operating-case section. No other states. */
export const PEDIDO_SOURCE_STATES = ['AVAILABLE', 'NO_FACT', 'UNPROVEN', 'ERROR'] as const;

export type PedidoSourceState = (typeof PEDIDO_SOURCE_STATES)[number];

/** Shown for every UNPROVEN section. Not a zero, and not a denial. */
export const PEDIDO_UNPROVEN_COPY = 'Información operativa aún no conectada.' as const;

export const PEDIDO_UNPROVEN_REASON = 'reader_not_connected' as const;

/**
 * Parked page 21a8b73 was not merged. This projection supersedes its data claims.
 * The page itself stays parked.
 */
export const PARKED_PEDIDO_PAGE_COMMIT = '21a8b73a2cc5fbb86931178e540b2bfa5c120c06' as const;
export const PARKED_PEDIDO_PAGE_MERGED = false as const;

export const PEDIDO_LABELS = {
  customer: 'Cliente',
  order: 'Pedido',
  primaryOwner: 'Responsable principal',
  coveringAdvisor: 'Cobertura',
  status: 'Estado',
  specialOrderClassification: 'Clasificación',
  customerCommittedDate: 'Fecha con el cliente',
  productionInternalTargetDate: 'Fecha interna de producción',
  production: 'Producción',
  risk: 'Riesgo',
  customerInformed: 'Cliente informado',
  purchasing: 'Compras',
  release: 'Liberación',
  finishedGoods: 'Producto terminado',
  allocation: 'Asignación',
  remainingFulfillment: 'Pendiente de cumplir',
  warehouseExit: 'Salida de almacén',
  delivery: 'Entrega',
  nextAction: 'Siguiente paso',
  latestImportantChange: 'Último cambio importante',
  evidenceHistory: 'Evidencia e historial',
} as const;

export type PedidoSectionId = keyof typeof PEDIDO_LABELS;

export type PedidoSection<T = unknown> =
  | {
      state: 'AVAILABLE';
      reason: null;
      displayCopy: string;
      fact: T;
    }
  | {
      state: 'NO_FACT';
      reason: string;
      displayCopy: string;
      fact: null;
    }
  | {
      state: 'UNPROVEN';
      reason: typeof PEDIDO_UNPROVEN_REASON;
      displayCopy: typeof PEDIDO_UNPROVEN_COPY;
      fact: null;
    }
  | {
      state: 'ERROR';
      reason: string;
      displayCopy: string;
      fact: null;
    };

export function unprovenSection(): PedidoSection<never> {
  return {
    state: 'UNPROVEN',
    reason: PEDIDO_UNPROVEN_REASON,
    displayCopy: PEDIDO_UNPROVEN_COPY,
    fact: null,
  };
}

export function noFactSection(reason: string, displayCopy: string): PedidoSection<never> {
  return { state: 'NO_FACT', reason, displayCopy, fact: null };
}

export function errorSection(reason: string, displayCopy: string): PedidoSection<never> {
  return { state: 'ERROR', reason, displayCopy, fact: null };
}

export function availableSection<T>(displayCopy: string, fact: T): PedidoSection<T> {
  return { state: 'AVAILABLE', reason: null, displayCopy, fact };
}
