/**
 * Pedido as post-sale handoff root.
 *
 * Production manufacturing stays product-keyed (no orderId on OsProductionTraceEntry).
 * Warehouse physical receipt may cite Pedido context without allocating.
 * Screens open/select Pedido by human-readable labels — never opaque ID entry.
 */

export const POSTSALE_HANDOFF_COPY = {
  kicker: 'Pedido',
  title: 'Contexto postventa',
  selectPedido: 'Seleccionar pedido',
  selectProduct: 'Producto del pedido',
  customer: 'Cliente',
  quote: 'Cotización de origen',
  lines: 'Líneas del pedido',
  quantities: 'Cantidades',
  commercial: 'Contexto comercial',
  evidence: 'Evidencia operativa registrada',
  noOpaqueIds: 'No escriba identificadores internos. Elija el pedido de la lista.',
  inheritOnce: 'Cliente, cotización y líneas se heredan del pedido. No se vuelven a teclear.',
  humanLinkProvenance:
    'El vínculo al pedido es una selección humana explícita: aporta contexto, no convierte la producción en propiedad del pedido.',
  expectedDate: 'Fecha esperada / próxima',
  expectedDateHint: 'Opcional. Si la registra, aparece en Trabajo y Atención al vencer.',
  note: 'Nota',
  milestone: 'Anotación operativa',
  responsible: 'Responsable',
} as const;

/** Explicit human Pedido→annotation link. Not automatic order ownership of production. */
export const PRODUCTION_PEDIDO_LINK_PROVENANCE = 'human_selected_pedido_context' as const;

export type PostSalePedidoLine = {
  orderLineId: string;
  productId: string;
  productLabel: string;
  quantityLabel: string | null;
  optionLabel: string;
};

export type PostSalePedidoOption = {
  orderId: string;
  orderLabel: string;
  partyId: string;
  customerLabel: string;
  quoteId: string | null;
  quoteLabel: string | null;
  ownerLabel: string | null;
  statusLabel: string | null;
  optionLabel: string;
  lines: PostSalePedidoLine[];
};

export type PostSaleOperationalEvidence = {
  kind: 'production_annotation' | 'finished_goods_receipt' | 'work_due' | 'other';
  label: string;
  recordedAt: string | null;
  actorLabel: string | null;
  note: string | null;
};

export type PostSalePedidoContext = {
  pedido: PostSalePedidoOption;
  evidence: PostSaleOperationalEvidence[];
};

type BuildPedidoInput = {
  organizationId: string;
  orderId: string;
  orderNumber?: string | null;
  partyId: string;
  customerLabel?: string | null;
  quoteId?: string | null;
  quoteNumber?: string | null;
  ownerLabel?: string | null;
  statusLabel?: string | null;
  lines: Array<{
    orderLineId: string;
    productRef?: string | null;
    description?: string | null;
    quantity?: number | null;
  }>;
};

function text(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function quantityLabel(quantity: number | null | undefined): string | null {
  if (typeof quantity !== 'number' || !Number.isFinite(quantity)) return null;
  return String(quantity);
}

/**
 * Build a human-readable Pedido option from commercial SoR facts.
 * Missing names never fall back to opaque ids as the only visible label.
 */
export function buildPostSalePedidoOption(input: BuildPedidoInput): PostSalePedidoOption | null {
  const organizationId = text(input.organizationId);
  const orderId = text(input.orderId);
  const partyId = text(input.partyId);
  if (!organizationId || !orderId || !partyId) return null;

  const orderLabel = text(input.orderNumber) || 'Pedido';
  const customerLabel = text(input.customerLabel) || 'Cliente';
  const quoteId = text(input.quoteId) || null;
  const quoteLabel = text(input.quoteNumber) || (quoteId ? 'Cotización' : null);

  const lines: PostSalePedidoLine[] = [];
  for (const line of input.lines) {
    const orderLineId = text(line.orderLineId);
    if (!orderLineId) continue;
    const productId = text(line.productRef) || orderLineId;
    const productLabel = text(line.description) || 'Producto del pedido';
    const qty = quantityLabel(line.quantity);
    lines.push({
      orderLineId,
      productId,
      productLabel,
      quantityLabel: qty,
      optionLabel: qty ? `${productLabel} · ${qty}` : productLabel,
    });
  }
  if (lines.length === 0) return null;

  return {
    orderId,
    orderLabel,
    partyId,
    customerLabel,
    quoteId,
    quoteLabel,
    ownerLabel: text(input.ownerLabel) || null,
    statusLabel: text(input.statusLabel) || null,
    optionLabel: `${customerLabel} · ${orderLabel}`,
    lines,
  };
}

export function buildPostSalePedidoOptions(
  rows: readonly BuildPedidoInput[],
): PostSalePedidoOption[] {
  const options: PostSalePedidoOption[] = [];
  for (const row of rows) {
    const option = buildPostSalePedidoOption(row);
    if (option) options.push(option);
  }
  return options.sort((left, right) => left.optionLabel.localeCompare(right.optionLabel, 'es'));
}

export function findPostSalePedido(
  options: readonly PostSalePedidoOption[],
  orderId: string | null | undefined,
): PostSalePedidoOption | null {
  const id = text(orderId);
  if (!id) return null;
  return options.find((row) => row.orderId === id) ?? null;
}

export function productOptionsForPedido(pedido: PostSalePedidoOption | null): Array<{
  id: string;
  label: string;
}> {
  if (!pedido) return [];
  return pedido.lines.map((line) => ({
    id: line.orderLineId,
    label: line.optionLabel,
  }));
}

export function resolveLineProduct(
  pedido: PostSalePedidoOption | null,
  orderLineId: string | null | undefined,
): PostSalePedidoLine | null {
  const id = text(orderLineId);
  if (!pedido || !id) return null;
  return pedido.lines.find((line) => line.orderLineId === id) ?? null;
}
