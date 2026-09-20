import {
  formatQuantity,
  parseQuantity,
  type OrderAllocation,
} from './order-allocation';

/**
 * Warehouse task view. Assignment of finished goods to a pedido.
 * Not official stock, not a delivery, and not a fulfillment status.
 *
 * CROSS_LANE: export this file from packages/os-contracts/src/index.ts.
 * CROSS_LANE: register WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE on the
 * operations-scope catalog. Cargo and warehouse.finished_goods.receive
 * must not imply it. Do not foreign-key product master or order lines.
 */

export const WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE = 'warehouse.finished_goods.allocate' as const;

export const WAREHOUSE_EXIT_HREF = '/entregas' as const;

export const WAREHOUSE_MISSING_NAME = 'El nombre no fue registrado';

export const WAREHOUSE_TASK_COPY = {
  kicker: 'Almacén',
  title: 'Registro de ingreso de producto terminado',
  intro:
    'Registre el ingreso de producto terminado vinculado al pedido. Esto no es stock oficial y no es una entrega.',
  waiting: 'Qué está esperando',
  allocatable: 'Qué puedo asignar',
  pedido: 'A qué pedido',
  quantity: 'Cuánto',
  remains: 'Qué queda',
  missingName: WAREHOUSE_MISSING_NAME,
  unknownAvailability: 'La cantidad disponible no está registrada. No es cero.',
  notOfficialStock: 'No es stock oficial.',
  receiptDoesNotAllocate:
    'Un ingreso al Almacén de Productos Terminados no asigna el producto a un pedido.',
  partialAllowed:
    'Puede asignar una parte. Varias asignaciones pueden cubrir una línea. Un pedido puede salir en partes más adelante. Eso no es un estado de cumplimiento.',
  exitNote: 'La salida de almacén es otro hecho. La nota de entrega no se registra aquí.',
  exitLink: 'Ir a Entregas',
  emptyWaiting: 'No hay producto terminado en espera de asignación.',
  emptyPedidos: 'No hay pedidos de esta empresa para asignar.',
  noRemainderRecorded: 'No se registró la cantidad del pedido. No se inventa lo que queda.',
  notFulfillment: 'No es un estado de cumplimiento.',
  correctionKeepsOriginal: 'La corrección se agrega. La asignación original se conserva.',
  permissionTitle: 'Sin permiso de almacén',
  permissionNoSession:
    'No hay una empresa en la sesión. No se acepta un identificador enviado por fuera.',
  permissionRole:
    'Esta cuenta no tiene el permiso asignado para asignar producto terminado. El cargo no lo concede.',
  permissionUnconfirmed:
    'No se confirmó el permiso de almacén en esta sesión. El cargo no basta. No se asigna nada.',
  loading: 'Cargando almacén…',
  errorTitle: 'No se pudo cargar almacén',
  errorDescription: 'No se muestra una cantidad inventada. Puede reintentar.',
} as const;

export type WarehouseDenialReason =
  | 'no_session_org'
  | 'unauthorized_role'
  | 'permission_unconfirmed'
  | 'cross_tenant';

export type WarehouseReceiptFact = {
  organizationId: string;
  productId: string;
  productLabel: string | null;
  quantity: string;
  receiptId: string | null;
};

export type WarehousePedidoFact = {
  organizationId: string;
  orderId: string;
  orderLabel: string | null;
  customerId: string | null;
  customerLabel: string | null;
  orderLineId: string;
  productId: string;
  productLabel: string | null;
  orderedQuantity: string | null;
};

export type WarehouseAllocationCorrection = {
  id: string;
  organizationId: string;
  allocationId: string;
  quantity: string;
  actorMemberId: string;
  actorLabel: string;
  reason: string;
  correctedAt: string;
  recordedAt: string;
  deletesAllocation: false;
};

export type RecordedName = {
  recorded: boolean;
  text: string;
};

export type WarehouseWaitingRow = {
  productId: string;
  productName: RecordedName;
  receiptQuantity: string | null;
  allocatedQuantity: string;
  unallocatedQuantity: string | null;
  waitingText: string;
  officialStock: false;
};

export type WarehouseAllocatableRow = {
  productId: string;
  productName: RecordedName;
  availableQuantity: string | null;
  availableText: string;
  canChooseQuantity: boolean;
  officialStock: false;
};

export type WarehousePedidoOption = {
  orderLineId: string;
  orderId: string;
  customerId: string | null;
  productId: string;
  customerName: RecordedName;
  orderName: RecordedName;
  productName: RecordedName;
  /** Visible label. Never a raw id standing in for a missing name. */
  optionLabel: string;
};

export type WarehouseRemainRow = {
  orderLineId: string;
  orderId: string;
  customerName: RecordedName;
  orderName: RecordedName;
  productName: RecordedName;
  orderedQuantity: string | null;
  allocatedQuantity: string;
  remainingQuantity: string | null;
  remainingText: string;
  fulfillmentStatus: null;
  officialStock: false;
};

export type WarehouseAllocationHistoryRow = {
  id: string;
  productId: string;
  orderLineId: string;
  quantity: string;
  allocatedAt: string;
  actorLabel: string;
  source: OrderAllocation['source'];
  productName: RecordedName;
  orderName: RecordedName;
  customerName: RecordedName;
  corrected: boolean;
  originalPreserved: true;
};

export type WarehouseTaskView = {
  organizationId: string;
  officialStock: false;
  isDelivery: false;
  fulfillmentStatus: null;
  receiptAllocates: false;
  waiting: WarehouseWaitingRow[];
  allocatable: WarehouseAllocatableRow[];
  pedidos: WarehousePedidoOption[];
  remains: WarehouseRemainRow[];
  allocations: WarehouseAllocationHistoryRow[];
  corrections: WarehouseAllocationCorrection[];
  exitHref: typeof WAREHOUSE_EXIT_HREF;
};

export function recordedName(label: string | null | undefined): RecordedName {
  const text = label?.trim() ?? '';
  if (!text) return { recorded: false, text: WAREHOUSE_MISSING_NAME };
  return { recorded: true, text };
}

/** Cargo and title are ignored on purpose. Receive is not allocate. */
export function canAllocateFinishedGoods(input: {
  grantedScopes?: readonly string[] | null;
  cargo?: string | null;
  title?: string | null;
} | null): boolean {
  void input?.cargo;
  void input?.title;
  if (!input?.grantedScopes) return false;
  return input.grantedScopes.some((scope) => scope.trim() === WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE);
}

export function sessionOrganizationId(
  session: { organizationId?: string | null } | null | undefined,
): string | null {
  const organizationId = session?.organizationId?.trim() ?? '';
  return organizationId.length > 0 ? organizationId : null;
}

export function sameTenantReceipts(
  receipts: readonly WarehouseReceiptFact[] | null,
  organizationId: string,
): readonly WarehouseReceiptFact[] | null {
  if (receipts === null) return null;
  return receipts.filter((receipt) => receipt.organizationId === organizationId);
}

export function netAllocatedQuantity(
  allocations: readonly OrderAllocation[],
  corrections: readonly WarehouseAllocationCorrection[],
  organizationId: string,
  match: (allocation: OrderAllocation) => boolean,
): string {
  const relevant = allocations.filter(
    (allocation) => allocation.organizationId === organizationId && match(allocation),
  );
  const allocated = relevant.reduce((sum, allocation) => sum + parseQuantity(allocation.quantity), 0n);
  const reversed = corrections.reduce((sum, correction) => {
    if (correction.organizationId !== organizationId) return sum;
    const allocation = relevant.find((item) => item.id === correction.allocationId);
    if (!allocation) return sum;
    return sum + parseQuantity(correction.quantity);
  }, 0n);
  return formatQuantity(allocated - reversed);
}

export function projectSameTenantAvailability(input: {
  organizationId: string;
  productId: string;
  receipts: readonly WarehouseReceiptFact[] | null;
  allocations: readonly OrderAllocation[];
  corrections: readonly WarehouseAllocationCorrection[];
}): {
  known: boolean;
  availableQuantity: string | null;
  receiptQuantity: string | null;
  allocatedQuantity: string;
  officialStock: false;
} {
  const allocatedQuantity = netAllocatedQuantity(
    input.allocations,
    input.corrections,
    input.organizationId,
    (allocation) => allocation.productId === input.productId,
  );
  const receipts = sameTenantReceipts(input.receipts, input.organizationId);
  if (receipts === null) {
    return {
      known: false,
      availableQuantity: null,
      receiptQuantity: null,
      allocatedQuantity,
      officialStock: false,
    };
  }
  const received = receipts.reduce((sum, receipt) => {
    if (receipt.productId !== input.productId) return sum;
    return sum + parseQuantity(receipt.quantity);
  }, 0n);
  return {
    known: true,
    availableQuantity: formatQuantity(received - parseQuantity(allocatedQuantity)),
    receiptQuantity: formatQuantity(received),
    allocatedQuantity,
    officialStock: false,
  };
}

export function suggestSameTenantPedidos(input: {
  organizationId: string;
  query: string;
  candidates: readonly WarehousePedidoFact[];
}): WarehousePedidoOption[] {
  const needle = input.query.trim().toLocaleLowerCase('es');
  return input.candidates
    .filter((candidate) => candidate.organizationId === input.organizationId)
    .map((candidate) => toPedidoOption(candidate))
    .filter((option) => {
      if (!needle) return true;
      const recorded = [option.customerName, option.orderName, option.productName]
        .filter((name) => name.recorded)
        .map((name) => name.text.toLocaleLowerCase('es'));
      return recorded.some((label) => label.includes(needle));
    })
    .sort((left, right) => left.optionLabel.localeCompare(right.optionLabel, 'es') || left.orderLineId.localeCompare(right.orderLineId));
}

export function buildWarehouseTaskView(input: {
  organizationId: string;
  receipts: readonly WarehouseReceiptFact[] | null;
  pedidos: readonly WarehousePedidoFact[];
  allocations: readonly OrderAllocation[];
  corrections: readonly WarehouseAllocationCorrection[];
}): WarehouseTaskView {
  const organizationId = input.organizationId;
  const pedidos = input.pedidos.filter((pedido) => pedido.organizationId === organizationId);
  const allocations = input.allocations.filter((allocation) => allocation.organizationId === organizationId);
  const corrections = input.corrections.filter((correction) => correction.organizationId === organizationId);
  const productIds = new Set<string>();
  const sameTenantReceipts = input.receipts === null ? null : input.receipts.filter((receipt) => receipt.organizationId === organizationId);
  for (const receipt of sameTenantReceipts ?? []) productIds.add(receipt.productId);
  for (const allocation of allocations) productIds.add(allocation.productId);
  for (const pedido of pedidos) productIds.add(pedido.productId);

  const waiting: WarehouseWaitingRow[] = [];
  const allocatable: WarehouseAllocatableRow[] = [];
  for (const productId of [...productIds].sort()) {
    const availability = projectSameTenantAvailability({
      organizationId,
      productId,
      receipts: input.receipts,
      allocations,
      corrections,
    });
    const productName = productNameFor(productId, sameTenantReceipts, pedidos);
    if (!availability.known || availability.availableQuantity === null || availability.receiptQuantity === null) {
      // Unknown availability: waiting only (cannot assign yet). Not duplicated in allocatable.
      if (allocations.some((allocation) => allocation.productId === productId) || pedidos.some((pedido) => pedido.productId === productId)) {
        waiting.push({
          productId,
          productName,
          receiptQuantity: null,
          allocatedQuantity: availability.allocatedQuantity,
          unallocatedQuantity: null,
          waitingText: WAREHOUSE_TASK_COPY.unknownAvailability,
          officialStock: false,
        });
      }
      continue;
    }
    const available = parseQuantity(availability.availableQuantity);
    if (available > 0n) {
      // Known unallocated qty: allocatable only (action surface). Not duplicated in waiting.
      allocatable.push({
        productId,
        productName,
        availableQuantity: availability.availableQuantity,
        availableText: `${availability.availableQuantity} disponible en el registro de ingresos menos asignaciones.`,
        canChooseQuantity: true,
        officialStock: false,
      });
    }
  }

  const remains = pedidos.map((pedido) => remainForPedido(pedido, allocations, corrections));
  const options = suggestSameTenantPedidos({ organizationId, query: '', candidates: pedidos });

  return {
    organizationId,
    officialStock: false,
    isDelivery: false,
    fulfillmentStatus: null,
    receiptAllocates: false,
    waiting,
    allocatable,
    pedidos: options,
    remains,
    allocations: allocations
      .slice()
      .sort((left, right) => left.allocatedAt.localeCompare(right.allocatedAt) || left.id.localeCompare(right.id))
      .map((allocation) => {
        const pedido = pedidos.find((item) => item.orderLineId === allocation.orderLineId) ?? null;
        return {
          id: allocation.id,
          productId: allocation.productId,
          orderLineId: allocation.orderLineId,
          quantity: allocation.quantity,
          allocatedAt: allocation.allocatedAt,
          actorLabel: allocation.actorLabel,
          source: allocation.source,
          productName: pedido ? recordedName(pedido.productLabel) : productNameFor(allocation.productId, sameTenantReceipts, pedidos),
          orderName: recordedName(pedido?.orderLabel),
          customerName: recordedName(pedido?.customerLabel),
          corrected: corrections.some((correction) => correction.allocationId === allocation.id),
          originalPreserved: true,
        };
      }),
    corrections: corrections.map((correction) => ({ ...correction, deletesAllocation: false as const })),
    exitHref: WAREHOUSE_EXIT_HREF,
  };
}

export function remainForPedido(
  pedido: WarehousePedidoFact,
  allocations: readonly OrderAllocation[],
  corrections: readonly WarehouseAllocationCorrection[],
): WarehouseRemainRow {
  const allocatedQuantity = netAllocatedQuantity(
    allocations,
    corrections,
    pedido.organizationId,
    (allocation) => allocation.orderLineId === pedido.orderLineId,
  );
  const orderedQuantity = parseOptionalQuantity(pedido.orderedQuantity);
  const remainingQuantity =
    orderedQuantity === null
      ? null
      : formatQuantity(parseQuantity(orderedQuantity) - parseQuantity(allocatedQuantity));
  return {
    orderLineId: pedido.orderLineId,
    orderId: pedido.orderId,
    customerName: recordedName(pedido.customerLabel),
    orderName: recordedName(pedido.orderLabel),
    productName: recordedName(pedido.productLabel),
    orderedQuantity,
    allocatedQuantity,
    remainingQuantity,
    remainingText:
      remainingQuantity === null
        ? WAREHOUSE_TASK_COPY.noRemainderRecorded
        : `Quedan ${remainingQuantity} por asignar`,
    fulfillmentStatus: null,
    officialStock: false,
  };
}

function parseOptionalQuantity(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return formatQuantity(parseQuantity(trimmed));
  } catch {
    return null;
  }
}

function productNameFor(
  productId: string,
  receipts: readonly WarehouseReceiptFact[] | null,
  pedidos: readonly WarehousePedidoFact[],
): RecordedName {
  const fromPedido = pedidos.find((pedido) => pedido.productId === productId && pedido.productLabel?.trim());
  if (fromPedido?.productLabel) return recordedName(fromPedido.productLabel);
  const fromReceipt = receipts?.find((receipt) => receipt.productId === productId && receipt.productLabel?.trim());
  return recordedName(fromReceipt?.productLabel);
}

function toPedidoOption(pedido: WarehousePedidoFact): WarehousePedidoOption {
  const customerName = recordedName(pedido.customerLabel);
  const orderName = recordedName(pedido.orderLabel);
  const productName = recordedName(pedido.productLabel);
  const orderRef = orderName.recorded
    ? (orderName.text.match(/^Pedido\b/i) ? orderName.text : `Pedido ${orderName.text}`)
    : 'Pedido';
  const parts = [orderRef];
  if (customerName.recorded) parts.push(customerName.text);
  if (productName.recorded) parts.push(productName.text);
  return {
    orderLineId: pedido.orderLineId,
    orderId: pedido.orderId,
    customerId: pedido.customerId,
    productId: pedido.productId,
    customerName,
    orderName,
    productName,
    optionLabel: parts.join(' · '),
  };
}
