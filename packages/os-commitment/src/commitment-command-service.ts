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
  currentIdempotencyKey,
  isIdempotencyConflict,
  openReplay,
  replayBinding,
  sealReplay,
  withIdempotencyKey,
} from '@isalwa/os-events';
import { createId } from '@isalwa/ts-utils';
import type { OsCommitmentStore } from './os-commitment-store';
import type { CommitmentChangeRecord, CommitmentDatabaseRecord } from './store-types';

const NOTICE_EXCERPT_MAX = 140;

function excerpt(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > NOTICE_EXCERPT_MAX ? `${trimmed.slice(0, NOTICE_EXCERPT_MAX - 1)}…` : trimmed;
}

export type CommitmentCommandName =
  | 'CreateEmployeeCommitment'
  | 'CreateCustomerReportedCommitment'
  | 'FulfillCommitment'
  | 'CancelCommitment'
  | 'ReassignCommitmentOwner'
  | 'RescheduleCommitment';

export type CommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

/**
 * Authority model:
 * - create = member_active (the owner may be another active member).
 * - fulfill / cancel / reschedule = member_active AND actor is the current owner.
 * - ReassignCommitmentOwner = the current owner, or one of the handover authorities the
 *   injected guard names (a commercial manager over the customer's account, or workforce
 *   continuity for an internal commitment whose owner no longer has access). Without the
 *   guard only the owner can hand over. Production, warehouse and purchasing commitments
 *   have no handover authority here and are not invented.
 */
export type CommitmentHandover =
  | { kind: 'owner' }
  | { kind: 'customer_manager'; range: 'org' | 'team' }
  | { kind: 'workforce_continuity' };

export type CommitmentReassignGuard = {
  /** Authority of a non-owner actor over this commitment, or null for none. */
  authority(
    ctx: RequestContext,
    commitment: CommitmentDatabaseRecord,
  ): Promise<Exclude<CommitmentHandover, { kind: 'owner' }> | null>;
  /** Whether this member may hold the commitment: a customer commitment needs a holder who can work that customer. */
  mayHold(
    ctx: RequestContext,
    commitment: CommitmentDatabaseRecord,
    targetMemberId: string,
    handover: CommitmentHandover,
  ): Promise<boolean>;
};
/**
 * Whether the actor may link a commitment to this party (F07). A false answer is
 * reported as NOT_FOUND, the same as a party that does not exist.
 */
export type CommitmentPartyLinkGuard = (ctx: RequestContext, partyId: string) => Promise<boolean>;

export class CommitmentCommandService {
  constructor(
    private readonly store: OsCommitmentStore,
    private readonly canLinkParty: CommitmentPartyLinkGuard | null = null,
    private readonly reassignGuard: CommitmentReassignGuard | null = null,
  ) {}

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
          organizationId: d.organizationId,
          delegator: d.delegator,
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

  /**
   * S11: authorize the current actor for this command, then return the stored
   * result only for the same actor, command, and payload. Any mismatch is
   * CONFLICT without the stored body; a row without that binding is
   * REPLAY_REVIEW_REQUIRED and is not re-run. When the commitment is linked to
   * a party, the actor must still own it or be allowed to link that party
   * (F07); otherwise NOT_FOUND, as for a party they cannot see.
   */
  private async acceptedReplay(
    ctx: RequestContext,
    command: CommitmentCommandName,
    payload: Record<string, unknown>,
    stored: Record<string, unknown>,
  ): Promise<CommandResult> {
    await this.authorize(ctx, command, ctx.organizationId);
    const result = openReplay<CommandResult>(stored, replayBinding(ctx.actorMemberId, command, payload));
    const commitmentId = [payload.commitmentId, result.data?.commitmentId].find(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );
    const commitment = commitmentId ? await this.store.getCommitmentInOrg(ctx.organizationId, commitmentId) : null;
    if (!commitment) throw new Error('NOT_FOUND');
    if (
      commitment.partyId &&
      commitment.ownerMemberId !== ctx.actorMemberId &&
      this.canLinkParty &&
      !(await this.canLinkParty(ctx, commitment.partyId))
    ) {
      throw new Error('NOT_FOUND');
    }
    return result;
  }

  /** A concurrent request with the same key won the insert: replay its result under the same rules. */
  private async replayAfterConflict(
    ctx: RequestContext,
    command: CommitmentCommandName,
    payload: Record<string, unknown>,
    err: unknown,
    idempotencyKey?: string,
  ): Promise<CommandResult> {
    if (idempotencyKey && isIdempotencyConflict(err)) {
      const existing = await this.store.findIdempotency(ctx.organizationId, idempotencyKey);
      if (existing) return this.acceptedReplay(ctx, command, payload, existing.resultJson);
    }
    throw err;
  }

  async execute(
    command: CommitmentCommandName,
    ctx: RequestContext,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<CommandResult> {
    return withIdempotencyKey(idempotencyKey, () =>
      this.runCommand(command, ctx, payload, idempotencyKey),
    );
  }

  private async runCommand(
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
        return this.acceptedReplay(ctx, command, payload, existing.resultJson);
      }
    }

    return this.store.runInTransaction(async (store) => {
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
        case 'RescheduleCommitment':
          result = await this.rescheduleCommitment(ctx, payload, store);
          break;
        default:
          throw new Error('VALIDATION_FAILED');
      }

      if (idempotencyKey) {
        await store.saveIdempotency({
          organizationId: ctx.organizationId,
          key: idempotencyKey,
          commandName: command,
          resultJson: sealReplay(result, replayBinding(ctx.actorMemberId, command, payload)),
          expiresAt: new Date(Date.now() + 86400_000),
        });
      }

      return result;
    }).catch((err: unknown) => this.replayAfterConflict(ctx, command, payload, err, idempotencyKey));
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
      idempotencyKey: currentIdempotencyKey(),
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
      fulfilledByMemberId: null,
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
    const commandName =
      origin === 'customer_reported' ? 'CreateCustomerReportedCommitment' : 'CreateEmployeeCommitment';
    await this.authorize(ctx, commandName, ctx.organizationId);

    const ownerMemberId = payload.ownerMemberId ? String(payload.ownerMemberId) : ctx.actorMemberId;
    const owner = await store.getMemberInOrg(ctx.organizationId, ownerMemberId);
    if (!owner || owner.accessStatus !== 'active') throw new Error('VALIDATION_FAILED');

    const partyId = payload.partyId ? String(payload.partyId) : null;
    if (partyId) {
      const partyExists = await store.partyExistsInOrg(ctx.organizationId, partyId);
      if (!partyExists) throw new Error('NOT_FOUND');
      if (this.canLinkParty && !(await this.canLinkParty(ctx, partyId))) throw new Error('NOT_FOUND');
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

    // The person made responsible hears about it; the person who recorded it for themselves does not.
    await this.noticeAssigned(store, dbRecord, ownerMemberId, ctx.actorMemberId);

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
    // customer_reported qualifies source only — never payment truth.
    return this.createCommitment(ctx, payload, store, 'customer_reported');
  }

  /** A commitment the actor cannot know about answers like a missing one (F07); the owner already knows it. */
  private async denyNonOwner(ctx: RequestContext, commitment: CommitmentDatabaseRecord): Promise<Error> {
    if (
      commitment.partyId &&
      this.canLinkParty &&
      !(await this.canLinkParty(ctx, commitment.partyId))
    ) {
      return new Error('NOT_FOUND');
    }
    return new Error('PERMISSION_DENIED');
  }

  private async requireOwnerOfOpen(
    ctx: RequestContext,
    store: OsCommitmentStore,
    commitmentId: string,
  ): Promise<CommitmentDatabaseRecord> {
    const commitment = await this.requireOpenCommitment(store, ctx.organizationId, commitmentId);
    if (commitment.ownerMemberId !== ctx.actorMemberId) throw await this.denyNonOwner(ctx, commitment);
    return commitment;
  }

  private async noticeAssigned(
    store: OsCommitmentStore,
    commitment: CommitmentDatabaseRecord,
    recipientMemberId: string,
    actorMemberId: string,
  ): Promise<void> {
    if (recipientMemberId === actorMemberId) return;
    await store.admitCommitmentNotice({
      id: createId(),
      organizationId: commitment.organizationId,
      recipientMemberId,
      kind: 'commitment_assigned',
      dedupKey: `commitment_assigned:commitment:${commitment.id}`,
      title: 'Compromiso asignado',
      body: excerpt(commitment.text),
      commitmentId: commitment.id,
      partyId: commitment.partyId,
    });
  }

  private async recordChange(
    ctx: RequestContext,
    store: OsCommitmentStore,
    commitment: CommitmentDatabaseRecord,
    change: Partial<CommitmentChangeRecord> & Pick<CommitmentChangeRecord, 'kind'>,
  ): Promise<string> {
    const id = createId();
    await store.insertCommitmentChange({
      id,
      organizationId: ctx.organizationId,
      commitmentId: commitment.id,
      actorMemberId: ctx.actorMemberId,
      reason: null,
      previousDueAt: null,
      newDueAt: null,
      previousOwnerMemberId: null,
      newOwnerMemberId: null,
      changedAt: ctx.effectiveAt,
      ...change,
    });
    return id;
  }

  private async fulfillCommitment(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommitmentStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'FulfillCommitment', ctx.organizationId);
    const commitmentId = String(payload.commitmentId);
    const commitment = await this.requireOwnerOfOpen(ctx, store, commitmentId);

    const result = fulfillCommitment(this.toContractRecord(commitment), ctx.effectiveAt.toISOString());
    if (!result.ok) throw new Error('VALIDATION_FAILED');

    const won = await store.updateOpenCommitment(ctx.organizationId, commitmentId, commitment.ownerMemberId, {
      lifecycle: 'fulfilled',
      fulfilledAt: ctx.effectiveAt,
      fulfilledByMemberId: ctx.actorMemberId,
    });
    if (!won) throw new Error('COMMITMENT_CHANGED');
    const note = typeof payload.note === 'string' && payload.note.trim() ? payload.note.trim() : null;
    await this.recordChange(ctx, store, commitment, { kind: 'fulfilled', reason: note });
    // The promise is kept: nobody still needs to be told it is due.
    await store.resolveCommitmentNotices(ctx.organizationId, commitmentId);

    return this.emit(
      ctx,
      store,
      'commitment.fulfilled',
      'commitment',
      commitmentId,
      { commitmentId, fulfilledByMemberId: ctx.actorMemberId },
      'commitment.fulfilled',
      { lifecycle: commitment.lifecycle },
      { lifecycle: 'fulfilled', fulfilledByMemberId: ctx.actorMemberId },
    );
  }

  private async cancelCommitment(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommitmentStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'CancelCommitment', ctx.organizationId);
    const commitmentId = String(payload.commitmentId);
    const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
    if (!reason) throw new Error('VALIDATION_FAILED');
    const commitment = await this.requireOwnerOfOpen(ctx, store, commitmentId);

    const result = cancelCommitment(this.toContractRecord(commitment), ctx.effectiveAt.toISOString());
    if (!result.ok) throw new Error('VALIDATION_FAILED');

    const won = await store.updateOpenCommitment(ctx.organizationId, commitmentId, commitment.ownerMemberId, {
      lifecycle: 'cancelled',
      cancelledAt: ctx.effectiveAt,
    });
    if (!won) throw new Error('COMMITMENT_CHANGED');
    await this.recordChange(ctx, store, commitment, { kind: 'cancelled', reason });
    await store.resolveCommitmentNotices(ctx.organizationId, commitmentId);

    return this.emit(
      ctx,
      store,
      'commitment.cancelled',
      'commitment',
      commitmentId,
      { commitmentId, reason },
      'commitment.cancelled',
      { lifecycle: commitment.lifecycle },
      { lifecycle: 'cancelled' },
    );
  }

  /**
   * The new deadline replaces the current one on the commitment; the replaced deadline, the
   * actor and the reason stay in the change history. Owner only, like fulfilling.
   */
  private async rescheduleCommitment(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommitmentStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'RescheduleCommitment', ctx.organizationId);
    const commitmentId = String(payload.commitmentId);
    const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
    const newDueAt = payload.dueAt ? new Date(String(payload.dueAt)) : null;
    if (!reason || !newDueAt || Number.isNaN(newDueAt.getTime())) throw new Error('VALIDATION_FAILED');
    const commitment = await this.requireOwnerOfOpen(ctx, store, commitmentId);
    // A change to the same instant is not a change: no history row, no event.
    if (commitment.dueAt && commitment.dueAt.getTime() === newDueAt.getTime()) {
      throw new Error('VALIDATION_FAILED');
    }

    const won = await store.updateOpenCommitment(ctx.organizationId, commitmentId, commitment.ownerMemberId, {
      dueAt: newDueAt,
    });
    if (!won) throw new Error('COMMITMENT_CHANGED');
    const changeId = await this.recordChange(ctx, store, commitment, {
      kind: 'rescheduled',
      reason,
      previousDueAt: commitment.dueAt,
      newDueAt,
    });
    // "Vence hoy" / "Vencido" described the old date. The next read raises one for the new date if it applies.
    await store.resolveCommitmentNotices(ctx.organizationId, commitmentId, {
      kinds: ['commitment_due', 'commitment_overdue'],
    });

    return this.emit(
      ctx,
      store,
      'commitment.rescheduled',
      'commitment',
      commitmentId,
      {
        commitmentId,
        changeId,
        previousDueAt: commitment.dueAt ? commitment.dueAt.toISOString() : null,
        dueAt: newDueAt.toISOString(),
        reason,
      },
      'commitment.rescheduled',
      { dueAt: commitment.dueAt ? commitment.dueAt.toISOString() : null },
      { dueAt: newDueAt.toISOString() },
    );
  }

  private async handoverAuthority(
    ctx: RequestContext,
    commitment: CommitmentDatabaseRecord,
  ): Promise<CommitmentHandover> {
    if (commitment.ownerMemberId === ctx.actorMemberId) return { kind: 'owner' };
    const granted = this.reassignGuard ? await this.reassignGuard.authority(ctx, commitment) : null;
    if (!granted) throw await this.denyNonOwner(ctx, commitment);
    return granted;
  }

  private async reassignCommitmentOwner(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommitmentStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'ReassignCommitmentOwner', ctx.organizationId);
    const commitmentId = String(payload.commitmentId);
    const newOwnerMemberId = String(payload.newOwnerMemberId);
    const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
    if (!reason) throw new Error('VALIDATION_FAILED');
    const commitment = await this.requireOpenCommitment(store, ctx.organizationId, commitmentId);
    const handover = await this.handoverAuthority(ctx, commitment);

    const newOwner = await store.getMemberInOrg(ctx.organizationId, newOwnerMemberId);
    if (!newOwner || newOwner.accessStatus !== 'active') throw new Error('VALIDATION_FAILED');
    if (newOwnerMemberId === commitment.ownerMemberId) throw new Error('VALIDATION_FAILED');
    // A customer commitment may only go to someone who can work that customer; handing it over grants nothing.
    if (this.reassignGuard && !(await this.reassignGuard.mayHold(ctx, commitment, newOwnerMemberId, handover))) {
      throw new Error('TARGET_PREREQUISITE_MISSING');
    }

    const previousOwnerMemberId = commitment.ownerMemberId;
    const won = await store.updateOpenCommitment(ctx.organizationId, commitmentId, previousOwnerMemberId, {
      ownerMemberId: newOwnerMemberId,
    });
    if (!won) throw new Error('COMMITMENT_CHANGED');
    const changeId = await this.recordChange(ctx, store, commitment, {
      kind: 'reassigned',
      reason,
      previousOwnerMemberId,
      newOwnerMemberId,
    });

    // The previous owner's open notices described a responsibility that moved.
    await store.resolveCommitmentNotices(ctx.organizationId, commitmentId, {
      kinds: ['commitment_assigned', 'commitment_due', 'commitment_overdue', 'responsibility_changed'],
      exceptRecipientMemberId: newOwnerMemberId,
    });
    await this.noticeAssigned(store, commitment, newOwnerMemberId, ctx.actorMemberId);
    const previousOwner = await store.getMemberInOrg(ctx.organizationId, previousOwnerMemberId);
    if (previousOwner?.accessStatus === 'active' && previousOwnerMemberId !== ctx.actorMemberId) {
      await store.admitCommitmentNotice({
        id: createId(),
        organizationId: ctx.organizationId,
        recipientMemberId: previousOwnerMemberId,
        kind: 'responsibility_changed',
        dedupKey: `responsibility_changed:commitment:${commitmentId}:${changeId}`,
        title: 'Compromiso reasignado',
        body: excerpt(commitment.text),
        commitmentId,
        partyId: commitment.partyId,
      });
    }

    return this.emit(
      ctx,
      store,
      'commitment.reassigned',
      'commitment',
      commitmentId,
      { commitmentId, changeId, newOwnerMemberId, previousOwnerMemberId, reason, authority: handover.kind },
      'commitment.reassigned',
      { ownerMemberId: previousOwnerMemberId },
      { ownerMemberId: newOwnerMemberId },
    );
  }
}
