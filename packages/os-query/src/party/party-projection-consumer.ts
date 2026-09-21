import type { BusinessEventEnvelope } from '@isalwa/os-contracts';
import {
  EVENT_SCHEMA_VERSION_POLICY,
  isOsPartyEventType,
  OS_PROJECTION_CONSUMER_KEYS,
  PROJECTION_SCHEMA_VERSION_POLICY,
} from '@isalwa/os-contracts';
import type { OsOutboxConsumerPort } from '@isalwa/os-events';
import type { OsPartyStore } from '@isalwa/os-party';
import type { OsProjectionStorePort, StoredPartyReadModel } from '../projection-store-port';

export type PartyProjectionDeps = {
  projectionStore: OsProjectionStorePort;
  partyStore: OsPartyStore;
};

function buildSearchText(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function hydratePartyReadModel(
  deps: PartyProjectionDeps,
  organizationId: string,
  partyId: string,
  asOf: Date,
  patch?: Partial<StoredPartyReadModel>,
): Promise<StoredPartyReadModel> {
  const party = await deps.partyStore.getPartyInOrg(organizationId, partyId);
  if (!party) {
    throw new Error('NOT_FOUND');
  }
  const roles = await deps.partyStore.listActivePartyRoles(organizationId, partyId, asOf);
  const commercial = await deps.partyStore.getCommercialAccountForParty(organizationId, partyId);
  const contacts = (await deps.partyStore.listContactsForOrgParty(organizationId, partyId)).items;
  const fiscalRows = await deps.partyStore.listFiscalIdentitiesForParty(organizationId, partyId);
  const fiscal =
    fiscalRows.find(
      (f) => f.effectiveAt <= asOf && (f.endedAt === null || f.endedAt > asOf),
    ) ?? null;

  const activeRoleKeys = roles.map((r) => r.roleKey);
  const searchText = buildSearchText([
    party.displayName,
    party.legalName,
    fiscal?.nit,
    fiscal?.razonSocial,
    ...contacts.flatMap((c) => [c.givenName, c.familyName, c.email, c.phone]),
  ]);

  return {
    partyId: party.id,
    organizationId: party.organizationId,
    partyKind: party.partyKind,
    displayName: party.displayName,
    legalName: party.legalName,
    status: party.status,
    activeRoleKeys,
    hasCommercialAccount: Boolean(commercial),
    commercialAccountStatus: commercial?.status ?? null,
    mergedIntoPartyId: party.mergedIntoPartyId,
    duplicateStatus: patch?.duplicateStatus ?? null,
    searchText,
    lastEventId: patch?.lastEventId ?? null,
    lastOccurredAt: patch?.lastOccurredAt ?? null,
    updatedAt: new Date(),
  };
}

export class PartyProjectionConsumer implements OsOutboxConsumerPort {
  readonly consumerKey = OS_PROJECTION_CONSUMER_KEYS.partySearch;

  constructor(private readonly deps: PartyProjectionDeps) {}

  private assertSchemaVersion(envelope: BusinessEventEnvelope): void {
    if (envelope.schemaVersion > EVENT_SCHEMA_VERSION_POLICY.current) {
      throw new Error('OUTBOX_SCHEMA_VERSION_UNKNOWN');
    }
  }

  private shouldApply(
    existing: StoredPartyReadModel | null,
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

  async deliver(envelope: BusinessEventEnvelope): Promise<void> {
    this.assertSchemaVersion(envelope);
    if (!isOsPartyEventType(envelope.eventType)) {
      if (PROJECTION_SCHEMA_VERSION_POLICY.onUnknownEventType === 'skip') return;
      throw new Error('UNKNOWN_EVENT_TYPE');
    }

    const partyId = envelope.primaryEntityType === 'party' ? envelope.primaryEntityId : null;
    if (!partyId && envelope.eventType !== 'contact.updated') return;

    const targetPartyId =
      partyId ??
      String((envelope.payload as { organizationPartyId?: string } | undefined)?.organizationPartyId ?? '');
    if (!targetPartyId) return;

    const existing = await this.deps.projectionStore.getPartyReadModel(
      envelope.organizationId,
      targetPartyId,
    );
    if (existing && !this.shouldApply(existing, envelope)) {
      return;
    }

    const occurredAt = new Date(envelope.occurredAt);
    let duplicateStatus = existing?.duplicateStatus ?? null;

    if (envelope.eventType === 'party.duplicate.suggested') {
      duplicateStatus = 'suggested';
    }
    if (envelope.eventType === 'party.merge.requested') {
      duplicateStatus = 'pending_merge';
    }
    if (envelope.eventType === 'party.merged') {
      duplicateStatus = 'none';
    }

    const model = await hydratePartyReadModel(
      this.deps,
      envelope.organizationId,
      targetPartyId,
      occurredAt,
      {
        duplicateStatus,
        lastEventId: envelope.id,
        lastOccurredAt: occurredAt,
      },
    );

    await this.deps.projectionStore.upsertPartyReadModel(model);
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

export async function replayPartyProjectionForOrg(
  deps: PartyProjectionDeps,
  organizationId: string,
  consumer: PartyProjectionConsumer,
): Promise<{ replayed: number }> {
  await deps.projectionStore.deletePartyReadModelsForOrg(organizationId);
  await deps.projectionStore.upsertCheckpoint({
    organizationId,
    consumerKey: consumer.consumerKey,
    lastEventId: null,
    lastOccurredAt: null,
    updatedAt: new Date(),
  });

  const { OS_PARTY_EVENT_TYPES } = await import('@isalwa/os-contracts');
  const events = await deps.projectionStore.listEventsForReplay(
    organizationId,
    OS_PARTY_EVENT_TYPES,
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
