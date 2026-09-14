/**
 * Purchase request reader. A request is not stock truth and does not compute stock.
 */

import { gateCompanyOperatingRead, type TrustedOperatingSession } from './capability';
import type {
  OperatingReadDb,
  PurchaseNoteRow,
  PurchaseRequestRow,
  PurchaseStatusHistoryRow,
} from './db-port';
import { purchaseStatusFact, type PurchaseStatusFact } from './purchase-status';
import { iso, sameTenant, storedText } from './rows';
import {
  availableFacts,
  missingFact,
  queryFailed,
  tenantPredicate,
  type ReadResult,
} from './source-state';

export type PurchaseNoteFact = {
  id: string;
  body: string;
  recordedAt: string;
  actorLabel: string;
  evidenceReference: string | null;
  evidenceIsStockReading: false;
};

export type PurchaseHistoryFact = {
  id: string;
  from: PurchaseStatusFact | null;
  to: PurchaseStatusFact;
  changedAt: string;
  actorLabel: string;
};

export type PurchaseRequestFact = {
  id: string;
  organizationId: string;
  requestingArea: string;
  requestedByLabel: string;
  requestedByMemberId: string | null;
  description: string;
  requestedQuantity: string | null;
  unit: string | null;
  productionContextId: string | null;
  orderId: string | null;
  orderLinkOwnsProduction: false;
  reason: string;
  requestedAt: string;
  status: PurchaseStatusFact;
  buyerLabel: string | null;
  buyerMemberId: string | null;
  stockAuthority: string;
  isStockTruth: false;
  stockQuantity: null;
  reorderPolicy: string;
  createsReorder: false;
  updatedAt: string;
  history: PurchaseHistoryFact[];
  notes: PurchaseNoteFact[];
};

function noteFact(row: PurchaseNoteRow): PurchaseNoteFact {
  return {
    id: row.id,
    body: row.body,
    recordedAt: iso(row.recordedAt),
    actorLabel: row.actorLabel,
    evidenceReference: storedText(row.evidenceReference),
    evidenceIsStockReading: false,
  };
}

function historyFact(row: PurchaseStatusHistoryRow): PurchaseHistoryFact {
  return {
    id: row.id,
    from: row.fromStatus ? purchaseStatusFact(row.fromStatus) : null,
    to: purchaseStatusFact(row.toStatus),
    changedAt: iso(row.changedAt),
    actorLabel: row.actorLabel,
  };
}

function requestFact(
  row: PurchaseRequestRow,
  history: readonly PurchaseStatusHistoryRow[],
  notes: readonly PurchaseNoteRow[],
): PurchaseRequestFact {
  return {
    id: row.id,
    organizationId: row.organizationId,
    requestingArea: row.requestingArea,
    requestedByLabel: row.requestedByLabel,
    requestedByMemberId: storedText(row.requestedByMemberId),
    description: row.description,
    requestedQuantity: storedText(row.quantity),
    unit: storedText(row.unit),
    productionContextId: storedText(row.productionContextId),
    orderId: storedText(row.orderId),
    orderLinkOwnsProduction: false,
    reason: row.reason,
    requestedAt: iso(row.requestedAt),
    status: purchaseStatusFact(row.status),
    buyerLabel: storedText(row.buyerLabel),
    buyerMemberId: storedText(row.buyerMemberId),
    stockAuthority: row.stockAuthority,
    isStockTruth: false,
    stockQuantity: null,
    reorderPolicy: row.reorderPolicy,
    createsReorder: false,
    updatedAt: iso(row.updatedAt),
    history: history.map(historyFact),
    notes: notes.map(noteFact),
  };
}

async function attachChildren(
  db: OperatingReadDb,
  organizationId: string,
  rows: readonly PurchaseRequestRow[],
): Promise<PurchaseRequestFact[]> {
  const scoped = sameTenant(organizationId, rows);
  if (scoped.length === 0) return [];
  const purchaseRequestIds = scoped.map((row) => row.id);
  const query = { ...tenantPredicate(organizationId), purchaseRequestIds };
  const [history, notes] = await Promise.all([
    db.listPurchaseRequestStatusHistory(query),
    db.listPurchaseRequestNotes(query),
  ]);
  const historyByRequest = sameTenant(organizationId, history);
  const notesByRequest = sameTenant(organizationId, notes);
  return scoped.map((row) =>
    requestFact(
      row,
      historyByRequest.filter((item) => item.purchaseRequestId === row.id),
      notesByRequest.filter((item) => item.purchaseRequestId === row.id),
    ),
  );
}

export async function readPurchaseRequests(input: {
  session: TrustedOperatingSession | null | undefined;
  db: OperatingReadDb | null;
}): Promise<ReadResult<PurchaseRequestFact>> {
  const gate = gateCompanyOperatingRead(input.session);
  if (!gate.ok) return gate.result;
  if (!input.db) {
    return unprovenNoReader(gate.organizationId, 'purchase_request');
  }
  try {
    const rows = await input.db.listPurchaseRequests(tenantPredicate(gate.organizationId));
    const facts = await attachChildren(input.db, gate.organizationId, rows);
    return availableFacts(gate.organizationId, facts);
  } catch {
    return queryFailed(gate.organizationId);
  }
}

export async function readPurchaseRequestById(input: {
  session: TrustedOperatingSession | null | undefined;
  db: OperatingReadDb | null;
  id: string;
}): Promise<ReadResult<PurchaseRequestFact>> {
  const gate = gateCompanyOperatingRead(input.session);
  if (!gate.ok) return gate.result;
  const id = input.id.trim();
  if (!id) return missingFact(gate.organizationId);
  if (!input.db) return unprovenNoReader(gate.organizationId, 'purchase_request');
  try {
    const row = await input.db.getPurchaseRequest({
      ...tenantPredicate(gate.organizationId),
      id,
    });
    if (!row || row.organizationId !== gate.organizationId || row.id !== id) {
      return missingFact(gate.organizationId);
    }
    const facts = await attachChildren(input.db, gate.organizationId, [row]);
    const fact = facts[0];
    if (!fact) return missingFact(gate.organizationId);
    return availableFacts(gate.organizationId, [fact]);
  } catch {
    return queryFailed(gate.organizationId);
  }
}

function unprovenNoReader(organizationId: string, reader: string) {
  return {
    state: 'UNPROVEN' as const,
    capability: 'management.org.read' as const,
    tenantPredicate: tenantPredicate(organizationId),
    facts: [] as [],
    factCount: null,
    reason: 'NO_LIVE_READER',
    reasonCode: 'NO_LIVE_READER' as const,
    detail: `No database port for ${reader}. This is not an empty result and not zero stock.`,
    stockQuantity: null,
    officialStock: false as const,
    collapsedToZero: false as const,
    representAsZeroStock: false as const,
  };
}
