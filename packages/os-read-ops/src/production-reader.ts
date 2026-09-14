/**
 * Production reader. A quema mixes products. It is not a Pedido.
 * Filter by product id only after that product is proven in the session organization.
 * Do not query production as if an order owned a run.
 */

import { gateCompanyOperatingRead, type TrustedOperatingSession } from './capability';
import type { OperatingReadDb } from './db-port';
import { iso, sameTenant, storedText } from './rows';
import {
  availableFacts,
  missingFact,
  queryFailed,
  tenantPredicate,
  unproven,
  type ReadResult,
} from './source-state';

export type ProductionQuemaFact = {
  id: string;
  organizationId: string;
  actorMemberId: string | null;
  actorLabel: string;
  source: string;
  recordedAt: string;
  productIds: string[];
  keyedToOrder: false;
};

export type ProductionQuemaTimeFact = {
  id: string;
  organizationId: string;
  quemaId: string;
  phase: string;
  at: string;
  actorLabel: string;
  recordedAt: string;
  keyedToOrder: false;
};

export type ProductionQuemaProductFact = {
  id: string;
  organizationId: string;
  quemaId: string;
  productId: string;
  quantity: string | null;
  unit: string | null;
  recordedAt: string;
  isSku: false;
  isStock: false;
};

export type ProductionTraceFact = {
  id: string;
  organizationId: string;
  kind: string;
  productId: string | null;
  stepKey: string | null;
  quemaId: string | null;
  actorLabel: string;
  occurredAt: string;
  recordedAt: string;
  /** Stored column only. Not a stock balance and not a warehouse receipt row. */
  receiptQuantityStored: string | null;
  quantityLostStored: string | null;
  goodCount: number | null;
  lostCount: number | null;
  provesFinishedGoodsHandoff: false;
  provesStock: false;
  listoIsAllocation: false;
  keyedToOrder: false;
};

export type ProductionFacts = {
  quemas: ProductionQuemaFact[];
  times: ProductionQuemaTimeFact[];
  products: ProductionQuemaProductFact[];
  traces: ProductionTraceFact[];
  keyedToOrder: false;
  filteredByProductId: string | null;
};

export type ProductionReadResult = ReadResult<ProductionFacts>;

function noReader(organizationId: string) {
  return unproven({
    organizationId,
    reasonCode: 'NO_LIVE_READER',
    reason: 'NO_LIVE_READER',
    detail: 'No database port for production. This is not an empty run list and not zero stock.',
  });
}

export async function readProductionFacts(input: {
  session: TrustedOperatingSession | null | undefined;
  db: OperatingReadDb | null;
  productId?: string;
  /**
   * Rejected. Production is not keyed to Pedido.
   * A present order id does not become an empty production list.
   */
  orderId?: string;
}): Promise<ProductionReadResult> {
  const gate = gateCompanyOperatingRead(input.session);
  if (!gate.ok) return gate.result;
  if (input.orderId !== undefined && input.orderId.trim() !== '') {
    return unproven({
      organizationId: gate.organizationId,
      reasonCode: 'production_not_order_keyed',
      reason: 'production_not_order_keyed',
      detail:
        'Production is not queried by order id. An order does not own a production run. This is not an empty production list.',
    });
  }
  if (!input.db) return noReader(gate.organizationId);

  const productId = input.productId?.trim() ?? '';
  try {
    if (productId) {
      const proven = await input.db.productProvenInOrganization({
        ...tenantPredicate(gate.organizationId),
        productId,
      });
      if (!proven) return missingFact(gate.organizationId);
    }

    const organizationId = gate.organizationId;
    const productLinks = sameTenant(
      organizationId,
      await input.db.listProductionQuemaProducts({
        ...tenantPredicate(organizationId),
        ...(productId ? { productId } : {}),
      }),
    ).filter((row) => !productId || row.productId === productId);
    const quemaIds = productId ? [...new Set(productLinks.map((row) => row.quemaId))] : undefined;
    const quemas = sameTenant(
      organizationId,
      await input.db.listProductionQuemas({
        ...tenantPredicate(organizationId),
        ...(quemaIds ? { quemaIds } : {}),
      }),
    ).filter((row) => !quemaIds || quemaIds.includes(row.id));
    const times = sameTenant(
      organizationId,
      await input.db.listProductionQuemaTimes({
        ...tenantPredicate(organizationId),
        ...(quemaIds ? { quemaIds } : {}),
      }),
    ).filter((row) => !quemaIds || quemaIds.includes(row.quemaId));
    const traces = sameTenant(
      organizationId,
      await input.db.listProductionTraceEntries({
        ...tenantPredicate(organizationId),
        ...(productId ? { productId } : {}),
      }),
    ).filter((row) => !productId || row.productId === productId);

    const productsByQuema = new Map<string, string[]>();
    for (const link of productLinks) {
      const current = productsByQuema.get(link.quemaId) ?? [];
      if (!current.includes(link.productId)) current.push(link.productId);
      productsByQuema.set(link.quemaId, current);
    }

    const facts: ProductionFacts = {
      quemas: quemas.map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        actorMemberId: storedText(row.actorMemberId),
        actorLabel: row.actorLabel,
        source: row.source,
        recordedAt: iso(row.recordedAt),
        productIds: productsByQuema.get(row.id) ?? [],
        keyedToOrder: false,
      })),
      times: times.map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        quemaId: row.quemaId,
        phase: row.phase,
        at: iso(row.at),
        actorLabel: row.actorLabel,
        recordedAt: iso(row.recordedAt),
        keyedToOrder: false,
      })),
      products: productLinks.map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        quemaId: row.quemaId,
        productId: row.productId,
        quantity: storedText(row.quantity),
        unit: storedText(row.unit),
        recordedAt: iso(row.recordedAt),
        isSku: false,
        isStock: false,
      })),
      traces: traces.map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        kind: row.kind,
        productId: storedText(row.productId),
        stepKey: storedText(row.stepKey),
        quemaId: storedText(row.quemaId),
        actorLabel: row.actorLabel,
        occurredAt: iso(row.occurredAt),
        recordedAt: iso(row.recordedAt),
        receiptQuantityStored: storedText(row.receiptQuantity),
        quantityLostStored: storedText(row.quantityLost),
        goodCount: row.goodCount,
        lostCount: row.lostCount,
        provesFinishedGoodsHandoff: false,
        provesStock: false,
        listoIsAllocation: false,
        keyedToOrder: false,
      })),
      keyedToOrder: false,
      filteredByProductId: productId || null,
    };

    const empty =
      facts.quemas.length === 0 &&
      facts.times.length === 0 &&
      facts.products.length === 0 &&
      facts.traces.length === 0;
    if (empty) return availableFacts(organizationId, []);
    return availableFacts(organizationId, [facts]);
  } catch {
    return queryFailed(gate.organizationId);
  }
}
