import type { BusinessEventEnvelope } from '@isalwa/os-contracts';
import {
  EVENT_SCHEMA_VERSION_POLICY,
  isOsWorkEventType,
  OS_PROJECTION_CONSUMER_KEYS,
  OS_WORK_EVENT_TYPES,
  PROJECTION_SCHEMA_VERSION_POLICY,
} from '@isalwa/os-contracts';
import type { OsOutboxConsumerPort } from '@isalwa/os-events';
import type { OsWorkStore } from '@isalwa/os-work';
import type { OsProjectionStorePort, StoredApprovalReadModel, StoredWorkReadModel } from '../projection-store-port';
import { deriveAttentionReadModels } from './attention-derivation';

export type WorkProjectionDeps = {
  projectionStore: OsProjectionStorePort;
  workStore: OsWorkStore;
};

async function hydrateWorkReadModel(
  deps: WorkProjectionDeps,
  organizationId: string,
  workItemId: string,
  patch?: Partial<StoredWorkReadModel>,
): Promise<StoredWorkReadModel> {
  const work = await deps.workStore.getWorkItemInOrg(organizationId, workItemId);
  if (!work) throw new Error('NOT_FOUND');

  const history = await deps.workStore.listOwnershipHistory(organizationId, workItemId);
  const pendingApproval = await deps.projectionStore.findPendingApprovalForWork(
    organizationId,
    workItemId,
  );

  const lastHistory = history.at(-1) ?? null;
  let lastReassigned: (typeof history)[number] | null = null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.reason === 'reassigned') {
      lastReassigned = history[i] ?? null;
      break;
    }
  }

  let approvalStatus: StoredWorkReadModel['approvalStatus'] = 'none';
  let pendingApprovalId: string | null = null;
  if (pendingApproval) {
    pendingApprovalId = pendingApproval.approvalRequestId;
    approvalStatus =
      pendingApproval.status === 'pending'
        ? 'pending'
        : pendingApproval.status === 'approved'
          ? 'approved'
          : 'rejected';
  }

  return {
    workItemId: work.id,
    organizationId: work.organizationId,
    title: work.title,
    description: work.description,
    status: work.status,
    priority: work.priority,
    ownerMemberId: work.ownerMemberId,
    createdByMemberId: work.createdByMemberId,
    subjectType: work.subjectType,
    subjectId: work.subjectId,
    dueAt: work.dueAt?.toISOString() ?? null,
    completedAt: work.completedAt?.toISOString() ?? null,
    cancelledAt: work.cancelledAt?.toISOString() ?? null,
    pendingApprovalId,
    approvalStatus,
    ownershipChangeCount: history.length,
    lastOwnershipChangeAt: lastHistory?.changedAt.toISOString() ?? null,
    lastEventId: patch?.lastEventId ?? null,
    lastOccurredAt: patch?.lastOccurredAt ?? null,
    lastReassignedAt: lastReassigned?.changedAt ?? null,
    updatedAt: new Date(),
  };
}

async function hydrateApprovalReadModel(
  deps: WorkProjectionDeps,
  organizationId: string,
  approvalRequestId: string,
  patch?: Partial<StoredApprovalReadModel>,
): Promise<StoredApprovalReadModel> {
  const approval = await deps.workStore.getApprovalRequest(organizationId, approvalRequestId);
  if (!approval) throw new Error('NOT_FOUND');

  return {
    approvalRequestId: approval.id,
    organizationId: approval.organizationId,
    workItemId: approval.workItemId,
    subjectType: approval.subjectType,
    subjectId: approval.subjectId,
    requestedByMemberId: approval.requestedByMemberId,
    approverMemberId: approval.approverMemberId,
    status: approval.status,
    decisionByMemberId: approval.decisionByMemberId,
    decisionReason: approval.decisionReason,
    decidedAt: approval.decidedAt?.toISOString() ?? null,
    requiredScope: 'approval.act',
    lastEventId: patch?.lastEventId ?? null,
    lastOccurredAt: patch?.lastOccurredAt ?? null,
    updatedAt: new Date(),
  };
}

async function rebuildAttention(deps: WorkProjectionDeps, organizationId: string): Promise<void> {
  const workItems = await deps.projectionStore.listWorkReadModelsForOrg(organizationId);
  const approvals = await deps.projectionStore.listApprovalReadModelsForOrg(organizationId);
  const attention = deriveAttentionReadModels(organizationId, workItems, approvals, new Date());
  await deps.projectionStore.replaceAttentionReadModels(organizationId, attention);
}

export class WorkProjectionConsumer implements OsOutboxConsumerPort {
  readonly consumerKey = OS_PROJECTION_CONSUMER_KEYS.workSummary;

  constructor(private readonly deps: WorkProjectionDeps) {}

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

  async deliver(envelope: BusinessEventEnvelope): Promise<void> {
    if (envelope.schemaVersion > EVENT_SCHEMA_VERSION_POLICY.current) {
      throw new Error('OUTBOX_SCHEMA_VERSION_UNKNOWN');
    }
    if (!isOsWorkEventType(envelope.eventType)) {
      if (PROJECTION_SCHEMA_VERSION_POLICY.onUnknownEventType === 'skip') return;
      throw new Error('UNKNOWN_EVENT_TYPE');
    }

    const occurredAt = new Date(envelope.occurredAt);
    const patch = { lastEventId: envelope.id, lastOccurredAt: occurredAt };

    if (envelope.eventType.startsWith('approval.')) {
      const approvalId = envelope.primaryEntityId;
      const existing = await this.deps.projectionStore.getApprovalReadModel(
        envelope.organizationId,
        approvalId,
      );
      if (existing && !this.shouldApply(existing, envelope)) return;

      const model = await hydrateApprovalReadModel(
        this.deps,
        envelope.organizationId,
        approvalId,
        patch,
      );
      await this.deps.projectionStore.upsertApprovalReadModel(model);

      if (model.workItemId) {
        const workExisting = await this.deps.projectionStore.getWorkReadModel(
          envelope.organizationId,
          model.workItemId,
        );
        if (!workExisting || this.shouldApply(workExisting, envelope)) {
          const workModel = await hydrateWorkReadModel(
            this.deps,
            envelope.organizationId,
            model.workItemId,
            patch,
          );
          await this.deps.projectionStore.upsertWorkReadModel(workModel);
        }
      }
    } else {
      const workItemId =
        envelope.primaryEntityType === 'work_item'
          ? envelope.primaryEntityId
          : String((envelope.payload as { workItemId?: string } | undefined)?.workItemId ?? '');
      if (!workItemId) return;

      const existing = await this.deps.projectionStore.getWorkReadModel(
        envelope.organizationId,
        workItemId,
      );
      if (existing && !this.shouldApply(existing, envelope)) return;

      const model = await hydrateWorkReadModel(
        this.deps,
        envelope.organizationId,
        workItemId,
        patch,
      );
      await this.deps.projectionStore.upsertWorkReadModel(model);
    }

    await rebuildAttention(this.deps, envelope.organizationId);

    await this.deps.projectionStore.upsertCheckpoint({
      organizationId: envelope.organizationId,
      consumerKey: this.consumerKey,
      lastEventId: envelope.id,
      lastOccurredAt: occurredAt,
      updatedAt: new Date(),
    });

    await this.deps.projectionStore.upsertFreshness(envelope.organizationId, this.consumerKey, {
      lastSuccessAt: new Date().toISOString(),
      lastEventOccurredAt: envelope.occurredAt,
      pendingOutboxCount: await this.deps.projectionStore.countPendingOutbox(envelope.organizationId),
      lastError: null,
    });

    await this.deps.projectionStore.upsertFreshness(
      envelope.organizationId,
      OS_PROJECTION_CONSUMER_KEYS.workAttention,
      {
        lastSuccessAt: new Date().toISOString(),
        lastEventOccurredAt: envelope.occurredAt,
        pendingOutboxCount: await this.deps.projectionStore.countPendingOutbox(
          envelope.organizationId,
        ),
        lastError: null,
      },
    );
  }
}

export async function replayWorkProjectionForOrg(
  deps: WorkProjectionDeps,
  organizationId: string,
  consumer: WorkProjectionConsumer,
): Promise<{ replayed: number }> {
  await deps.projectionStore.deleteWorkReadModelsForOrg(organizationId);
  await deps.projectionStore.deleteApprovalReadModelsForOrg(organizationId);
  await deps.projectionStore.deleteAttentionReadModelsForOrg(organizationId);

  const events = await deps.projectionStore.listEventsForReplay(
    organizationId,
    OS_WORK_EVENT_TYPES,
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
  });

  return { replayed: events.length };
}
