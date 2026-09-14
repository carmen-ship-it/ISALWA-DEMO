/**
 * Database port. Callers do not pass rows. Each method is a tenant-scoped query.
 * There is no finished-goods receipt method: that model is not in the schema.
 * There is no production-by-order method: production is not keyed to Pedido.
 */

export type TenantScopedQuery = {
  organizationId: string;
};

export type PurchaseRequestRow = {
  id: string;
  organizationId: string;
  requestingArea: string;
  requestedByLabel: string;
  requestedByMemberId: string | null;
  description: string;
  quantity: string | null;
  unit: string | null;
  productionContextId: string | null;
  orderId: string | null;
  reason: string;
  requestedAt: Date | string;
  status: string;
  buyerLabel: string | null;
  buyerMemberId: string | null;
  stockAuthority: string;
  reorderPolicy: string;
  updatedAt: Date | string;
};

export type PurchaseStatusHistoryRow = {
  id: string;
  organizationId: string;
  purchaseRequestId: string;
  fromStatus: string | null;
  toStatus: string;
  changedAt: Date | string;
  actorLabel: string;
};

export type PurchaseNoteRow = {
  id: string;
  organizationId: string;
  purchaseRequestId: string;
  body: string;
  recordedAt: Date | string;
  actorLabel: string;
  evidenceReference: string | null;
};

export type ProductionQuemaRow = {
  id: string;
  organizationId: string;
  actorMemberId: string | null;
  actorLabel: string;
  source: string;
  recordedAt: Date | string;
};

export type ProductionQuemaTimeRow = {
  id: string;
  organizationId: string;
  quemaId: string;
  phase: string;
  at: Date | string;
  actorLabel: string;
  recordedAt: Date | string;
};

export type ProductionQuemaProductRow = {
  id: string;
  organizationId: string;
  quemaId: string;
  productId: string;
  quantity: string | null;
  unit: string | null;
  recordedAt: Date | string;
};

export type ProductionTraceRow = {
  id: string;
  organizationId: string;
  kind: string;
  productId: string | null;
  stepKey: string | null;
  quemaId: string | null;
  actorLabel: string;
  occurredAt: Date | string;
  recordedAt: Date | string;
  receiptQuantity: string | null;
  quantityLost: string | null;
  goodCount: number | null;
  lostCount: number | null;
};

export type OrderAllocationRow = {
  id: string;
  organizationId: string;
  productId: string;
  goodsKind: string;
  quantity: string;
  orderLineId: string;
  allocatedAt: Date | string;
  recordedAt: Date | string;
  actorMemberId: string | null;
  actorLabel: string;
  source: string;
  finishedGoodsReceiptId: string | null;
};

export type OperatingReadDb = {
  listPurchaseRequests(query: TenantScopedQuery): Promise<PurchaseRequestRow[]>;
  getPurchaseRequest(query: TenantScopedQuery & { id: string }): Promise<PurchaseRequestRow | null>;
  listPurchaseRequestStatusHistory(
    query: TenantScopedQuery & { purchaseRequestIds: readonly string[] },
  ): Promise<PurchaseStatusHistoryRow[]>;
  listPurchaseRequestNotes(
    query: TenantScopedQuery & { purchaseRequestIds: readonly string[] },
  ): Promise<PurchaseNoteRow[]>;
  productProvenInOrganization(
    query: TenantScopedQuery & { productId: string },
  ): Promise<boolean>;
  listProductionQuemas(
    query: TenantScopedQuery & { quemaIds?: readonly string[] },
  ): Promise<ProductionQuemaRow[]>;
  listProductionQuemaTimes(
    query: TenantScopedQuery & { quemaIds?: readonly string[] },
  ): Promise<ProductionQuemaTimeRow[]>;
  listProductionQuemaProducts(
    query: TenantScopedQuery & { productId?: string },
  ): Promise<ProductionQuemaProductRow[]>;
  listProductionTraceEntries(
    query: TenantScopedQuery & { productId?: string },
  ): Promise<ProductionTraceRow[]>;
  listOrderAllocations(
    query: TenantScopedQuery & { productId?: string; orderLineId?: string },
  ): Promise<OrderAllocationRow[]>;
  getOrderAllocation(query: TenantScopedQuery & { id: string }): Promise<OrderAllocationRow | null>;
};
