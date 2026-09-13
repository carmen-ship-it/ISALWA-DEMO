import type { BusinessEventEnvelope } from '@isalwa/os-contracts';
import {
  EVENT_SCHEMA_VERSION_POLICY,
  isOsCommercialEventType,
  OS_COMMERCIAL_EVENT_TYPES,
  OS_PROJECTION_CONSUMER_KEYS,
  PROJECTION_SCHEMA_VERSION_POLICY,
} from '@isalwa/os-contracts';
import type { OsOutboxConsumerPort } from '@isalwa/os-events';
import type { OsCommercialStore } from '@isalwa/os-commercial';
import type {
  OsProjectionStorePort,
  StoredOpportunityReadModel,
  StoredOrderReadModel,
  StoredQuoteLineReadModel,
  StoredQuoteReadModel,
} from '../projection-store-port';

export type CommercialProjectionDeps = {
  projectionStore: OsProjectionStorePort;
  commercialStore: OsCommercialStore;
};

async function hydrateOpportunityReadModel(
  deps: CommercialProjectionDeps,
  organizationId: string,
  opportunityId: string,
  patch?: Partial<StoredOpportunityReadModel>,
): Promise<StoredOpportunityReadModel> {
  const row = await deps.commercialStore.getOpportunityInOrg(organizationId, opportunityId);
  if (!row) throw new Error('NOT_FOUND');
  return {
    opportunityId: row.id,
    organizationId: row.organizationId,
    partyId: row.partyId,
    commercialAccountId: row.commercialAccountId,
    ownerMemberId: row.ownerMemberId,
    title: row.title,
    stage: row.stage,
    status: row.status,
    expectedValueCentavos: row.expectedValueCentavos,
    closedAt: row.closedAt,
    createdAt: row.createdAt,
    lastEventId: patch?.lastEventId ?? null,
    lastOccurredAt: patch?.lastOccurredAt ?? null,
    updatedAt: new Date(),
  };
}

async function hydrateQuoteReadModel(
  deps: CommercialProjectionDeps,
  organizationId: string,
  quoteId: string,
  patch?: Partial<StoredQuoteReadModel>,
): Promise<StoredQuoteReadModel> {
  const row = await deps.commercialStore.getQuoteInOrg(organizationId, quoteId);
  if (!row) throw new Error('NOT_FOUND');
  return {
    quoteId: row.id,
    organizationId: row.organizationId,
    partyId: row.partyId,
    commercialAccountId: row.commercialAccountId,
    opportunityId: row.opportunityId,
    ownerMemberId: row.ownerMemberId,
    quoteNumber: row.quoteNumber,
    status: row.status,
    currency: row.currency,
    subtotalCentavos: row.subtotalCentavos,
    headerDiscountCentavos: row.headerDiscountCentavos,
    totalCentavos: row.totalCentavos,
    revisionNumber: row.revisionNumber,
    notes: row.notes,
    submittedAt: row.submittedAt,
    cancelledAt: row.cancelledAt,
    createdAt: row.createdAt,
    lastEventId: patch?.lastEventId ?? null,
    lastOccurredAt: patch?.lastOccurredAt ?? null,
    updatedAt: new Date(),
  };
}

async function hydrateQuoteLines(
  deps: CommercialProjectionDeps,
  organizationId: string,
  quoteId: string,
): Promise<StoredQuoteLineReadModel[]> {
  const lines = await deps.commercialStore.listQuoteLines(organizationId, quoteId);
  const now = new Date();
  return lines.map((line: Awaited<ReturnType<OsCommercialStore['listQuoteLines']>>[number]) => ({
    quoteLineId: line.id,
    organizationId: line.organizationId,
    quoteId: line.quoteId,
    lineNumber: line.lineNumber,
    description: line.description,
    quantity: line.quantity,
    unitLabel: line.unitLabel,
    unitPriceCentavos: line.unitPriceCentavos,
    discountCentavos: line.discountCentavos,
    lineTotalCentavos: line.lineTotalCentavos,
    productRef: line.productRef,
    updatedAt: now,
  }));
}

async function hydrateOrderReadModel(
  deps: CommercialProjectionDeps,
  organizationId: string,
  orderId: string,
  patch?: Partial<StoredOrderReadModel>,
): Promise<StoredOrderReadModel> {
  const row = await deps.commercialStore.getOrderInOrg(organizationId, orderId);
  if (!row) throw new Error('NOT_FOUND');
  return {
    orderId: row.id,
    organizationId: row.organizationId,
    partyId: row.partyId,
    commercialAccountId: row.commercialAccountId,
    quoteId: row.quoteId,
    ownerMemberId: row.ownerMemberId,
    orderNumber: row.orderNumber,
    status: row.status,
    currency: row.currency,
    subtotalCentavos: row.subtotalCentavos,
    headerDiscountCentavos: row.headerDiscountCentavos,
    totalCentavos: row.totalCentavos,
    cancelledAt: row.cancelledAt,
    createdAt: row.createdAt,
    lastEventId: patch?.lastEventId ?? null,
    lastOccurredAt: patch?.lastOccurredAt ?? null,
    updatedAt: new Date(),
  };
}

export class CommercialProjectionConsumer implements OsOutboxConsumerPort {
  readonly consumerKey = OS_PROJECTION_CONSUMER_KEYS.commercialSummary;

  constructor(private readonly deps: CommercialProjectionDeps) {}

  private shouldApply(
    existing: { lastOccurredAt: Date | null; lastEventId: string | null } | null,
    envelope: BusinessEventEnvelope,
  ): boolean {
    if (!existing?.lastOccurredAt) return true;
    const incoming = new Date(envelope.occurredAt);
    if (incoming > existing.lastOccurredAt) return true;
    if (incoming.getTime() === existing.lastOccurredAt.getTime()) {
      return existing.lastEventId !== envelope.id;
    }
    return false;
  }

  private resolveQuoteId(envelope: BusinessEventEnvelope): string | null {
    if (envelope.primaryEntityType === 'quote') return envelope.primaryEntityId;
    const payload = envelope.payload as { quoteId?: string } | undefined;
    return payload?.quoteId ?? null;
  }

  async deliver(envelope: BusinessEventEnvelope): Promise<void> {
    if (envelope.schemaVersion > EVENT_SCHEMA_VERSION_POLICY.current) {
      throw new Error('OUTBOX_SCHEMA_VERSION_UNKNOWN');
    }
    if (!isOsCommercialEventType(envelope.eventType)) {
      if (PROJECTION_SCHEMA_VERSION_POLICY.onUnknownEventType === 'skip') return;
      throw new Error('UNKNOWN_EVENT_TYPE');
    }

    const occurredAt = new Date(envelope.occurredAt);
    const patch = { lastEventId: envelope.id, lastOccurredAt: occurredAt };

    if (envelope.eventType.startsWith('opportunity.')) {
      const opportunityId = envelope.primaryEntityId;
      const existing = await this.deps.projectionStore.getOpportunityReadModel(
        envelope.organizationId,
        opportunityId,
      );
      if (existing && !this.shouldApply(existing, envelope)) return;

      const model = await hydrateOpportunityReadModel(
        this.deps,
        envelope.organizationId,
        opportunityId,
        patch,
      );
      await this.deps.projectionStore.upsertOpportunityReadModel(model);
    } else if (envelope.eventType.startsWith('order.')) {
      const orderId = envelope.primaryEntityId;
      const existing = await this.deps.projectionStore.getOrderReadModel(
        envelope.organizationId,
        orderId,
      );
      if (existing && !this.shouldApply(existing, envelope)) return;

      const model = await hydrateOrderReadModel(
        this.deps,
        envelope.organizationId,
        orderId,
        patch,
      );
      await this.deps.projectionStore.upsertOrderReadModel(model);
    } else if (envelope.eventType.startsWith('quote.')) {
      const quoteId = this.resolveQuoteId(envelope);
      if (!quoteId) return;

      const existing = await this.deps.projectionStore.getQuoteReadModel(
        envelope.organizationId,
        quoteId,
      );
      if (existing && !this.shouldApply(existing, envelope)) return;

      const model = await hydrateQuoteReadModel(
        this.deps,
        envelope.organizationId,
        quoteId,
        patch,
      );
      await this.deps.projectionStore.upsertQuoteReadModel(model);

      const lines = await hydrateQuoteLines(this.deps, envelope.organizationId, quoteId);
      await this.deps.projectionStore.replaceQuoteLineReadModels(
        envelope.organizationId,
        quoteId,
        lines,
      );
    }

    await this.deps.projectionStore.upsertCheckpoint({
      organizationId: envelope.organizationId,
      consumerKey: this.consumerKey,
      lastEventId: envelope.id,
      lastOccurredAt: occurredAt,
      updatedAt: new Date(),
    });

    const pending = await this.deps.projectionStore.countPendingOutbox(envelope.organizationId);
    await this.deps.projectionStore.upsertFreshness(envelope.organizationId, this.consumerKey, {
      lastSuccessAt: new Date().toISOString(),
      lastEventOccurredAt: envelope.occurredAt,
      pendingOutboxCount: pending,
      lastError: null,
    });
  }
}

export async function replayCommercialProjectionForOrg(
  deps: CommercialProjectionDeps,
  organizationId: string,
  consumer: CommercialProjectionConsumer,
): Promise<{ replayed: number }> {
  await deps.projectionStore.deleteQuoteLineReadModelsForOrg(organizationId);
  await deps.projectionStore.deleteQuoteReadModelsForOrg(organizationId);
  await deps.projectionStore.deleteOrderReadModelsForOrg(organizationId);
  await deps.projectionStore.deleteOpportunityReadModelsForOrg(organizationId);

  const events = await deps.projectionStore.listEventsForReplay(
    organizationId,
    OS_COMMERCIAL_EVENT_TYPES,
  );

  for (const row of events) {
    await consumer.deliver({
      id: row.id,
      organizationId: row.organizationId,
      eventType: row.eventType,
      schemaVersion: row.schemaVersion,
      occurredAt: row.occurredAt.toISOString(),
      recordedAt: row.recordedAt.toISOString(),
      actorMemberId: row.actorMemberId,
      primaryEntityType: row.primaryEntityType,
      primaryEntityId: row.primaryEntityId,
      correlationId: row.correlationId,
      provenance: 'replay',
      dataOrigin: 'production',
      payload: row.payloadJson ?? undefined,
    });
  }

  await deps.projectionStore.upsertFreshness(organizationId, consumer.consumerKey, {
    rebuiltAt: new Date().toISOString(),
    lastError: null,
    pendingOutboxCount: await deps.projectionStore.countPendingOutbox(organizationId),
  });

  return { replayed: events.length };
}
