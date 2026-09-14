/**
 * Classification of live writers. Production and finished-goods receive use prisma_port
 * where the model, mutation capability, and tenant rule already exist. Missing pieces
 * stay named. No capability string is invented. Migrations may exist unapplied.
 */

export const LIVE_WRITER_MATRIX = [
  {
    domain: 'purchase_request_transition',
    model: 'OsPurchaseRequest + status history',
    capability: 'purchasing.operational.record',
    tenantPredicate: 'authorizePurchaseRequestTransition',
    audit: 'in-memory event object; no canonical Prisma/outbox writer',
    state: 'NOT_IMPLEMENTED',
    blocker: 'BLOCKED_BY_GATE_C',
    detail:
      'Blocked migration 20260916140000_os_purchase_status_workflow remaps English base statuses to Spanish ids (solicitado/cotizandose/entregado). A Prisma transition writer that requires that REWRITE must not be implemented until Gate C DB state is known. Memory transition stays; this migration file is not touched.',
  },
  {
    domain: 'production_entry',
    model: 'OsProductionTraceEntry',
    capability: 'production.entry.member',
    tenantPredicate: 'session organization on the Prisma port',
    audit: 'append-only trace; prisma_port; migration exists unapplied',
    state: 'IMPLEMENTED',
    blocker: null,
    detail: 'production.review.member does not authorize entry. Prisma port exists; migration 20260915130000 exists and is not applied.',
  },
  {
    domain: 'quema_start_end',
    model: 'OsProductionQuema + OsProductionQuemaTime + OsProductionQuemaProduct',
    capability: 'production.entry.member',
    tenantPredicate: 'session organization on the Prisma port',
    audit: 'append-only quema facts; prisma_port; migration exists unapplied',
    state: 'IMPLEMENTED',
    blocker: null,
    detail: 'Quema remains multi-product with startedAt/endedAt. Prisma port exists; migration 20260915130000 exists and is not applied.',
  },
  {
    domain: 'loss',
    model: 'OsProductionTraceEntry kind loss',
    capability: 'production.entry.member',
    tenantPredicate: 'session organization on the Prisma port',
    audit: 'append-only corrections; prisma_port; migration exists unapplied',
    state: 'IMPLEMENTED',
    blocker: null,
    detail: 'Loss facts persist through the Prisma port. Corrections append. Migration 20260915130000 exists and is not applied.',
  },
  {
    domain: 'consumption',
    model: 'OsProductionTraceEntry kind consumption',
    capability: 'production.entry.member',
    tenantPredicate: 'session organization on the Prisma port',
    audit: 'append-only trace; inventoryEffect none; prisma_port; migration exists unapplied',
    state: 'IMPLEMENTED',
    blocker: null,
    detail: 'Reported consumption does not decrement authoritative stock. Prisma port exists; migration 20260915130000 exists and is not applied.',
  },
  {
    domain: 'finished_goods_receive',
    model: 'OsFinishedGoodsReceipt',
    capability: 'warehouse.finished_goods.receive',
    tenantPredicate: 'session organization; citations proven in that organization',
    audit: 'os_business_events finished_goods.received / finished_goods.corrected',
    state: 'IMPLEMENTED',
    blocker: null,
    detail: 'Additive migration exists and is not applied. Receive does not allocate and does not post stock.',
  },
  {
    domain: 'allocation',
    model: 'OsOrderAllocation',
    capability: 'warehouse.finished_goods.allocate',
    tenantPredicate: 'AllocationTenantTargets keyed by session organization',
    audit: 'os_order_allocations + os_business_events finished_goods.allocated; prisma_port',
    state: 'IMPLEMENTED',
    blocker: null,
    detail:
      'Prisma port exists; migration 20260915170000 exists and is not applied. Receive, delivery.record, commercial.team.read, and people.admin do not authorize allocate. Partial and multiple allocations allowed; remaining quantity is a projection.',
  },
  {
    domain: 'warehouse_exit',
    model: 'OsWarehouseExit + outbound note tables',
    capability: 'warehouse.outbound.record (NOT registered in OPERATIONS_ACCESS_SCOPE_KEYS)',
    tenantPredicate: 'fulfillment read is tenant-scoped; write authority is blocked',
    audit: 'insert helpers may exist; liveWrite AUTHORITY_BLOCKED — not REAL_PERSISTENT',
    state: 'NOT_IMPLEMENTED',
    blocker: 'CROSS_LANE_CHANGE_REQUEST',
    detail:
      'WAREHOUSE_EXIT_WRITE_AUTHORITY = CROSS_LANE_CHANGE_REQUEST. Do not invent or register warehouse.outbound.record. Warehouse exit is not customer delivery.',
  },
  {
    domain: 'delivery',
    model: 'OsDelivery + OsDeliveryNote + lines + evidence',
    capability: 'delivery.record',
    tenantPredicate: 'session organization owns the order; member scopes from stored assignments',
    audit: 'prisma_port customer delivery; externalDocumentNumber preserved; no automatic numbering',
    state: 'IMPLEMENTED',
    blocker: null,
    detail:
      'createPrismaDeliveryStore persists customer delivery. Note is born at delivery. Partial and multiple deliveries allowed. delivery.record does not authorize warehouse exit or allocate.',
  },
  {
    domain: 'customer_communication',
    model: 'OsCustomerConversation is evidence, not an informed-status column',
    capability: 'no canonical informed-of-order write located',
    tenantPredicate: 'conversation rows are tenant-scoped',
    audit: 'conversation is not the informed fact',
    state: 'NOT_IMPLEMENTED',
    blocker: 'FOUNDATION_GAP',
    detail: 'A message is not customer-informed. CustomerDateInformedRecord covers date-issue notice only.',
  },
  {
    domain: 'coordination_decision',
    model: 'OsCoordinationDecision',
    capability: 'coordination.decision.record',
    tenantPredicate: 'recordCoordinationDecision session organization; foreign org denied',
    audit: 'decision row is the record; record is not a read capability',
    state: 'IMPLEMENTED',
    blocker: null,
    detail:
      'prisma_port writer inserts after the pure builder authorizes. Migration 20260916160000 is unapplied. Write scope does not unlock prior-decision reads; COORDINATION_READ_AUTHORITY stays CROSS_LANE.',
  },
  {
    domain: 'payment_evidence',
    model: 'OsReportedOperationalFact',
    capability: 'finance.operational.record',
    tenantPredicate: 'session organization must match fact organizationId',
    audit: 'reported row is operational evidence; confirmation stays pending; no ledger confirm',
    state: 'IMPLEMENTED',
    blocker: null,
    detail:
      'createPrismaReportedOperationalFactWriter inserts/reverses via builders. Mixed tenders preserved. Never ledger-confirms. Hosted write remains UNPROVEN until migration apply and API wire.',
  },
  {
    domain: 'commercial_exception_authorization',
    model: 'no dedicated commercial-exception persistence confirmed as the write target',
    capability: 'commercial.exception.authorize',
    tenantPredicate: 'explicit capability only; title grants nothing',
    audit: 'not confirmed as an outbox contract',
    state: 'NOT_IMPLEMENTED',
    blocker: 'FOUNDATION_GAP',
    detail: 'The capability exists. A Prisma writer is not added without a confirmed model and audit contract.',
  },
  {
    domain: 'special_order_classification',
    model: 'OsSpecialOrderClassification',
    capability: 'no dedicated write capability confirmed',
    tenantPredicate: 'classification rows are organization-scoped',
    audit: 'not confirmed as an outbox contract',
    state: 'NOT_IMPLEMENTED',
    blocker: 'CROSS_LANE_CHANGE_REQUEST',
    detail: 'Pedido Especial stays an explicit classification. No numeric threshold and no invented write scope.',
  },
] as const;

/** P1 FOUNDATION_GAP: date-issue informed exists; general informed-of-order does not. */
export const CUSTOMER_INFORMED_FOUNDATION_GAP = {
  kind: 'FOUNDATION_GAP' as const,
  id: 'CUSTOMER_INFORMED_OF_ORDER',
  priority: 'P1' as const,
  missingFact:
    'An explicit record that the customer was informed about an operating fact other than a ProductionDateIssue, with occurredAt, actor/source, and the related order or customer. CustomerDateInformedRecord covers date-issue notice only. OsCustomerConversation is not that fact.',
} as const;

export const COORDINATION_READ_AUTHORITY = {
  kind: 'CROSS_LANE_CHANGE_REQUEST' as const,
  id: 'COORDINATION_READ_AUTHORITY',
  doNotUse: ['coordination.decision.record', 'operations.coordinator.record'] as const,
  detail:
    'OsCoordinationDecision is persisted. No canonical read capability exists. The reader stays behind a closed gate.',
} as const;

/**
 * warehouse.outbound.record is not in OPERATIONS_ACCESS_SCOPE_KEYS.
 * Do not invent or register it here. Exit insert helpers are not REAL_PERSISTENT.
 */
export const WAREHOUSE_EXIT_WRITE_AUTHORITY = {
  kind: 'CROSS_LANE_CHANGE_REQUEST' as const,
  id: 'WAREHOUSE_EXIT_WRITE_AUTHORITY',
  scopeNotRegistered: 'warehouse.outbound.record' as const,
  liveWrite: 'AUTHORITY_BLOCKED' as const,
  detail:
    'Customer delivery with delivery.record can be prisma_port. Warehouse exit live write stays AUTHORITY_BLOCKED until the outbound scope is registered through a cross-lane change.',
} as const;
