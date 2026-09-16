import type { RequestContext } from '@isalwa/os-contracts';
import {
  createEmployeeCommitment,
  fulfillCommitment,
  cancelCommitment,
  type CommitmentRecord,
  type CommitmentOrigin,
  COMMITMENT_SUBJECT_TYPES,
} from '@isalwa/os-contracts';
import {
  assertMemberActive,
  assertTenantMatch,
  computeEffectiveScopes,
  type MemberAccessSnapshot,
} from '@isalwa/os-domain';
import {
  buildAuditEntry,
  buildBusinessEvent,
  buildOutboxForEvent,
} from '@isalwa/os-events';
import { createId } from '@isalwa/ts-utils';
import type { OsCommitmentStore } from './os-commitment-store';
import type { CommitmentDatabaseRecord } from './store-types';

export type CommitmentCommandName =
  | 'CreateEmployeeCommitment'
  | 'CreateCustomerReportedCommitment'
  | 'FulfillCommitment'
  | 'CancelCommitment'
  | 'ReassignCommitmentOwner';

export type CommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

/**
 * Authority model (per Wave B spec):
 * - create/fulfill/cancel own = member_active
 * - ReassignCommitmentOwner = member_active AND (actor === current owner)
 *   No people.admin fallback. Future: commitment.manage scope.
 */
export class CommitmentCommandService {
  private activeIdempotencyKey?: string;

  constructor(private readonly store: OsCommitmentStore) {}

  private async snapshotInOrg(
    organizationId: string,
    memberId: string,
    asOf: Date,
  ): Promise<MemberAccessSnapshot | null> {
    const member = await this.store.getMemberInOrg(organizationId, memberId);
    if (!member) return null;
    const roles = await this.store.listRoleAssignmentsForMember(memberId, organizationId);
    const delegations = await this.store.listDelegationsForDelegate(memberId, organizationId);
    return {
      memberId: member.id,
      organizationId: member.organizationId,
      accessStatus: member.accessStatus,
      roleKeys: computeEffectiveScopes(
        roles.map((r) => ({ roleKey: r.roleKey, effectiveAt: r.effectiveAt, endedAt: r.endedAt })),
        delegations.map((d) => ({
          scopes: d.scopes,
          startsAt: d.startsAt,
          expiresAt: d.expiresAt,
          revokedAt: d.revokedAt,
          delegatorMemberId: d.delegatorMemberId,
        })),
        asOf,
      ),
      delegatedScopes: [],
    };
  }

  private async authorize(
    ctx: RequestContext,
    _command: CommitmentCommandName,
    targetOrgId: string,
  ): Promise<MemberAccessSnapshot> {
    assertTenantMatch(ctx.organizationId, targetOrgId);
    const snap = await this.snapshotInOrg(ctx.organizationId, ctx.actorMemberId, ctx.effectiveAt);
    if (!snap) throw new Error('AUTH_REQUIRED');
    assertMemberActive(snap);
    // All commitment commands require member_active only
    return snap;
  }

  async execute(
    command: CommitmentCommandName,
    ctx: RequestContext,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<CommandResult> {
    const actor = await this.store.getMemberInOrg(ctx.organizationId, ctx.actorMemberId);
    if (!actor || actor.organizationId !== ctx.organizationId) {
      throw new Error('TENANT_FORBIDDEN');
    }

    if (idempotencyKey) {
      const existing = await this.store.findIdempotency(ctx.organizationId, idempotencyKey);
      if (existing) {
        return existing.resultJson as unknown as CommandResult;
      }
    }

    return this.store.runInTransaction(async (store) => {
      this.activeIdempotencyKey = idempotencyKey;
      let result: CommandResult;
      switch (command) {
        case 'CreateEmployeeCommitment':
          result = await this.createEmployeeCommitment(ctx, payload, store);
          break;
        case 'CreateCustomerReportedCommitment':
          result = await this.createCustomerReportedCommitment(ctx, payload, store);
          break;
        case 'FulfillCommitment':
          result = await this.fulfillCommitment(ctx, payload, store);
          break;
        case 'CancelCommitment':
          result = await this.cancelCommitment(ctx, payload, store);
          break;
        case 'ReassignCommitmentOwner':
          result = await this.reassignCommitmentOwner(ctx, payload, store);
          break;
        default:
          throw new Error('VALIDATION_FAILED');
      }

      if (idempotencyKey) {
        await store.saveIdempotency({
          organizationId: ctx.organizationId,
          key: idempotencyKey,
          commandName: command,
          resultJson: result as unknown as Record<string, unknown>,
          expiresAt: new Date(Date.now() + 86400_000),
        });
      }

      return result;
    });
  }

  private async emit(
    ctx: RequestContext,
    store: OsCommitmentStore,
    eventType: string,
    primaryType: string,
    primaryId: string,
    payload?: Record<string, unknown>,
    auditAction?: string,
    before?: Record<string, unknown>,
    after?: Record<string, unknown>,
  ): Promise<CommandResult> {
    const event = buildBusinessEvent({
      organizationId: ctx.organizationId,
      eventType,
      occurredAt: ctx.effectiveAt,
      actorMemberId: ctx.actorMemberId,
      authorizationContext: { memberId: ctx.actorMemberId },
      primaryEntityType: primaryType,
      primaryEntityId: primaryId,
      payload,
      correlationId: ctx.correlationId,
      idempotencyKey: this.activeIdempotencyKey,
      capabilityKey: 'commitment',
    });
    const outbox = buildOutboxForEvent(event);
    const audit = buildAuditEntry(
      ctx.organizationId,
      ctx.actorMemberId,
      auditAction ?? eventType,
      primaryType,
      primaryId,
      ctx.correlationId,
      before,
      after,
    );
    await store.appendEventAndAudit(event, outbox, audit);
    return {
      commandId: event.id,
      correlationId: ctx.correlationId,
      data: { eventId: event.id, ...(payload ?? {}) },
    };
  }

  private async requireOpenCommitment(
    store: OsCommitmentStore,
    orgId: string,
    commitmentId: string,
  ): Promise<CommitmentDatabaseRecord> {
    const commitment = await store.getCommitmentInOrg(orgId, commitmentId);
    if (!commitment) throw new Error('NOT_FOUND');
    if (commitment.lifecycle !== 'open') throw new Error('VALIDATION_FAILED');
    return commitment;
  }

  private async validateSubject(
    store: OsCommitmentStore,
    orgId: string,
    subjectType?: string | null,
    subjectId?: string | null,
  ): Promise<void> {
    if (!subjectType || !subjectId) return;
    if (subjectType === 'party') {
      const ok = await store.partyExistsInOrg(orgId, subjectId);
      if (!ok) throw new Error('NOT_FOUND');
    }
    // Other subject types: quote, order, etc. are opaque references (no foreign key validation)
    // since they may come from conversations or external sources.
  }

  private toDatabaseRecord(record: CommitmentRecord): CommitmentDatabaseRecord {
    return {
      id: record.id,
      organizationId: record.organizationId,
      partyId: record.partyId,
      ownerMemberId: record.ownerMemberId,
      text: record.text,
      dueAt: record.dueAt ? new Date(record.dueAt) : null,
      origin: record.origin,
      relatedSubjectType: record.relatedSubjectType,
      relatedSubjectId: record.relatedSubjectId,
      lifecycle: record.lifecycle,
      createdByMemberId: record.createdByMemberId,
      createdAt: new Date(record.createdAt),
      fulfilledAt: record.fulfilledAt ? new Date(record.fulfilledAt) : null,
      cancelledAt: record.cancelledAt ? new Date(record.cancelledAt) : null,
      provenanceSuggestionId: record.provenanceSuggestionId,
    };
  }

  private toContractRecord(db: CommitmentDatabaseRecord): CommitmentRecord {
    return {
      id: db.id,
      organizationId: db.organizationId,
      partyId: db.partyId,
      ownerMemberId: db.ownerMemberId,
      text: db.text,
      dueAt: db.dueAt ? db.dueAt.toISOString() : null,
      origin: db.origin,
      relatedSubjectType: db.relatedSubjectType,
      relatedSubjectId: db.relatedSubjectId,
      lifecycle: db.lifecycle,
      createdByMemberId: db.createdByMemberId,
      createdAt: db.createdAt.toISOString(),
      fulfilledAt: db.fulfilledAt ? db.fulfilledAt.toISOString() : null,
      cancelledAt: db.cancelledAt ? db.cancelledAt.toISOString() : null,
      provenanceSuggestionId: db.provenanceSuggestionId,
      canonical: true,
    };
  }

  private async createCommitment(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommitmentStore,
    origin: CommitmentOrigin,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'CreateEmployeeCommitment', ctx.organizationId);

    const ownerMemberId = payload.ownerMemberId ? String(payload.ownerMemberId) : ctx.actorMemberId;
    const owner = await store.getMemberInOrg(ctx.organizationId, ownerMemberId);
    if (!owner || owner.accessStatus !== 'active') throw new Error('VALIDATION_FAILED');

    const partyId = payload.partyId ? String(payload.partyId) : null;
    if (partyId) {
      const partyExists = await store.partyExistsInOrg(ctx.organizationId, partyId);
      if (!partyExists) throw new Error('NOT_FOUND');
    }

    const subjectType = payload.relatedSubjectType ? String(payload.relatedSubjectType) : null;
    const subjectId = payload.relatedSubjectId ? String(payload.relatedSubjectId) : null;
    await this.validateSubject(store, ctx.organizationId, subjectType, subjectId);

    const commitmentId = createId();
    const dueAt = payload.dueAt ? String(payload.dueAt) : null;
    const text = String(payload.text);

    const result = createEmployeeCommitment({
      id: commitmentId,
      organizationId: ctx.organizationId,
      ownerMemberId,
      createdByMemberId: ctx.actorMemberId,
      text,
      dueAt,
      partyId,
      relatedSubjectType: subjectType,
      relatedSubjectId: subjectId,
      createdAt: ctx.effectiveAt.toISOString(),
    });

    if (!result.ok) {
      throw new Error('VALIDATION_FAILED');
    }

    // Override the origin if needed (for customer_reported)
    const dbRecord = this.toDatabaseRecord(result.commitment);
    dbRecord.origin = origin;

    await store.insertCommitment(dbRecord);

    return this.emit(ctx, store, 'commitment.created', 'commitment', commitmentId, {
      commitmentId,
      ownerMemberId,
      text,
      dueAt,
      partyId,
      origin,
    });
  }

  private async createEmployeeCommitment(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommitmentStore,
  ): Promise<CommandResult> {
    return this.createCommitment(ctx, payload, store, 'employee_entered');
  }

  /**
   * CreateCustomerReportedCommitment: a commitment where the origin is the customer
   * reporting a date or expectation. DOES NOT imply payment confirmed.
   * The origin stays 'employee_entered' per the current contract, but we could
   * add 'customer_reported' to COMMITMENT_ORIGINS if needed.
   */
  private async createCustomerReportedCommitment(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommitmentStore,
  ): Promise<CommandResult> {
    // Use employee_entered since customer_reported is not in current contract origins
    // This is intentional: customer_reported origin does NOT imply payment confirmed
    return this.createCommitment(ctx, payload, store, 'employee_entered');
  }

  private async fulfillCommitment(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommitmentStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'FulfillCommitment', ctx.organizationId);
    const commitmentId = String(payload.commitmentId);
    const commitment = await this.requireOpenCommitment(store, ctx.organizationId, commitmentId);

    // Only owner can fulfill their own commitment
    if (commitment.ownerMemberId !== ctx.actorMemberId) {
      throw new Error('PERMISSION_DENIED');
    }

    const contractRecord = this.toContractRecord(commitment);
    const result = fulfillCommitment(contractRecord, ctx.effectiveAt.toISOString());

    if (!result.ok) {
      throw new Error('VALIDATION_FAILED');
    }

    await store.updateCommitment(commitmentId, {
      lifecycle: 'fulfilled',
      fulfilledAt: ctx.effectiveAt,
    });

    return this.emit(
      ctx,
      store,
      'commitment.fulfilled',
      'commitment',
      commitmentId,
      { commitmentId },
      'commitment.fulfilled',
      { lifecycle: commitment.lifecycle },
      { lifecycle: 'fulfilled' },
    );
  }

  private async cancelCommitment(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommitmentStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'CancelCommitment', ctx.organizationId);
    const commitmentId = String(payload.commitmentId);
    const commitment = await this.requireOpenCommitment(store, ctx.organizationId, commitmentId);

    // Only owner can cancel their own commitment
    if (commitment.ownerMemberId !== ctx.actorMemberId) {
      throw new Error('PERMISSION_DENIED');
    }

    const contractRecord = this.toContractRecord(commitment);
    const result = cancelCommitment(contractRecord, ctx.effectiveAt.toISOString());

    if (!result.ok) {
      throw new Error('VALIDATION_FAILED');
    }

    await store.updateCommitment(commitmentId, {
      lifecycle: 'cancelled',
      cancelledAt: ctx.effectiveAt,
    });

    return this.emit(
      ctx,
      store,
      'commitment.cancelled',
      'commitment',
      commitmentId,
      { commitmentId, reason: payload.reason ? String(payload.reason) : undefined },
      'commitment.cancelled',
      { lifecycle: commitment.lifecycle },
      { lifecycle: 'cancelled' },
    );
  }

  private async reassignCommitmentOwner(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommitmentStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'ReassignCommitmentOwner', ctx.organizationId);
    const commitmentId = String(payload.commitmentId);
    const newOwnerMemberId = String(payload.newOwnerMemberId);
    const commitment = await this.requireOpenCommitment(store, ctx.organizationId, commitmentId);

    // Per spec: only current owner can reassign. No people.admin fallback.
    if (commitment.ownerMemberId !== ctx.actorMemberId) {
      throw new Error('PERMISSION_DENIED');
    }

    const newOwner = await store.getMemberInOrg(ctx.organizationId, newOwnerMemberId);
    if (!newOwner || newOwner.accessStatus !== 'active') {
      throw new Error('VALIDATION_FAILED');
    }

    const previousOwnerMemberId = commitment.ownerMemberId;

    await store.updateCommitment(commitmentId, {
      ownerMemberId: newOwnerMemberId,
    });

    return this.emit(
      ctx,
      store,
      'commitment.reassigned',
      'commitment',
      commitmentId,
      { commitmentId, newOwnerMemberId, previousOwnerMemberId },
      'commitment.reassigned',
      { ownerMemberId: previousOwnerMemberId },
      { ownerMemberId: newOwnerMemberId },
    );
  }
}
