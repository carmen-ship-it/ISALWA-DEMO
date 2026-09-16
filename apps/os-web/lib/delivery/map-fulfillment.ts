import type {
  EntregaEvidenceView,
  EntregaLineView,
  EntregaPanelProps,
} from '@/components/delivery/entrega-panel';
import type { OrderSummaryReadModel } from '@isalwa/os-contracts';

export type FulfillmentDeliveryItem = {
  id: string;
  orderId: string;
  deliveredAt: string;
  deliveredTo: string | null;
  recordedByMemberId: string;
  source: string;
  notes: string | null;
  deliveryNote: {
    lines: Array<{
      description: string;
      quantity: number;
      unitLabel: string | null;
    }>;
  } | null;
  evidence: Array<{
    role: string;
    recordedByMemberId: string;
    reference: string | null;
    note: string | null;
    paymentState: string | null;
    recipient: string | null;
    signatureReference: string | null;
    confirmedLedgerPayment: false;
  }>;
};

export type FulfillmentWarehouseExitItem = {
  id: string;
  orderId: string;
  exitedAt: string;
  recordedByMemberId: string;
  source: string;
  notes: string | null;
  outboundNote: {
    lines: Array<{
      description: string;
      quantity: number;
      unitLabel: string | null;
    }>;
  } | null;
};

export type LinkedOrderFact = {
  orderId: string;
  orderNumber: string;
  partyId: string;
  status: string;
};

const EVIDENCE_ROLES = new Set([
  'commercial_coordination',
  'accounting_payment',
  'warehouse_outbound',
  'delivery_confirmation',
]);

function toLines(
  lines: ReadonlyArray<{ description: string; quantity: number; unitLabel: string | null }> | null | undefined,
): EntregaLineView[] {
  if (!lines) return [];
  return lines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unitLabel: line.unitLabel,
  }));
}

function toEvidence(
  rows: FulfillmentDeliveryItem['evidence'],
): EntregaEvidenceView[] {
  return rows
    .filter((row) => EVIDENCE_ROLES.has(row.role))
    .map((row) => ({
      role: row.role as EntregaEvidenceView['role'],
      actorLabel: row.recordedByMemberId,
      reference: row.reference,
      note: row.note,
      paymentState:
        row.paymentState === 'reference' || row.paymentState === 'authorized_exception'
          ? row.paymentState
          : null,
      confirmedLedgerPayment: false as const,
      recipient: row.recipient,
      signatureReference: row.signatureReference,
    }));
}

export function mapFulfillmentDeliveriesToPanel(
  items: readonly FulfillmentDeliveryItem[],
): EntregaPanelProps['deliveries'] {
  return items.map((item) => ({
    id: item.id,
    deliveredAt: item.deliveredAt,
    deliveredTo: item.deliveredTo,
    recordedByLabel: item.recordedByMemberId,
    sourceLabel: item.source,
    notes: item.notes,
    lines: toLines(item.deliveryNote?.lines),
    evidence: toEvidence(item.evidence),
  }));
}

export function mapFulfillmentExitsToPanel(
  items: readonly FulfillmentWarehouseExitItem[],
): EntregaPanelProps['warehouseExits'] {
  return items.map((item) => ({
    id: item.id,
    exitedAt: item.exitedAt,
    recordedByLabel: item.recordedByMemberId,
    sourceLabel: item.source,
    notes: item.notes,
    lines: toLines(item.outboundNote?.lines),
  }));
}

/** Open tenant orders for honest pedido binding — not invented deliveries. */
export function mapOrdersToLinkedFacts(
  items: readonly OrderSummaryReadModel[],
): LinkedOrderFact[] {
  return items
    .filter((item) => item.status !== 'cancelled')
    .map((item) => ({
      orderId: item.orderId,
      orderNumber: item.orderNumber,
      partyId: item.partyId,
      status: item.status,
    }));
}
