import type { DelegatorStanding } from '@isalwa/os-domain';
import type { RequestContext } from '@isalwa/os-contracts';
import {
  assertMemberActive,
  assertTenantMatch,
  computeEffectiveScopes,
  memberHasScope,
  type MemberAccessSnapshot,
} from '@isalwa/os-domain';
import { buildAuditEntry } from './append';
import { isIdempotencyConflict, openReplay, replayBinding } from './replay';
import type { OsOutboxStorePort, OutboxRecoveryResult } from './outbox-port';

const RETRY_DEAD_LETTER_COMMAND = 'RetryDeadLetterDelivery';

export type OutboxRecoveryCommandResult = {
  commandId: string;
  correlationId: string;
  data: OutboxRecoveryResult;
};

type WorkforceAuthReader = {
  getMemberInOrg(organizationId: string, memberId: string): Promise<{
    id: string;
    organizationId: string;
    accessStatus: string;
  } | null>;
  listRoleAssignmentsForMember(
    memberId: string,
    organizationId?: string,
  ): Promise<Array<{ roleKey: string; effectiveAt: Date; endedAt: Date | null }>>;
  listDelegationsForDelegate(
    memberId: string,
    organizationId?: string,
  ): Promise<
    Array<{
      scopes: string[];
      startsAt: Date;
      expiresAt: Date;
      revokedAt: Date | null;
      delegatorMemberId: string;
      organizationId?: string;
      delegator?: DelegatorStanding;
    }>
  >;
};

export class OutboxRecoveryService {
  constructor(
    private readonly store: OsOutboxStorePort,
    private readonly workforce: WorkforceAuthReader,
  ) {}

  private async snapshot(memberId: string, orgId: string, asOf: Date): Promise<MemberAccessSnapshot> {
    const member = await this.workforce.getMemberInOrg(orgId, memberId);
    if (!member) throw new Error('AUTH_REQUIRED');
    const roles = await this.workforce.listRoleAssignmentsForMember(memberId, orgId);
    const delegations = await this.workforce.listDelegationsForDelegate(memberId, orgId);
    const roleKeys = computeEffectiveScopes(
      roles.map((r) => ({
        roleKey: r.roleKey,
        effectiveAt: r.effectiveAt,
        endedAt: r.endedAt,
      })),
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
    );
    return {
      memberId: member.id,
      organizationId: member.organizationId,
      accessStatus: member.accessStatus,
      roleKeys,
      delegatedScopes: [],
    };
  }

  private async authorize(ctx: RequestContext): Promise<void> {
    assertTenantMatch(ctx.organizationId, ctx.organizationId);
    const snap = await this.snapshot(ctx.actorMemberId, ctx.organizationId, ctx.effectiveAt);
    assertMemberActive(snap);
    if (!memberHasScope(snap, 'people.admin')) {
      throw new Error('PERMISSION_DENIED');
    }
  }

  async retryDeadLetterDelivery(
    ctx: RequestContext,
    outboxId: string,
    reason: string,
    idempotencyKey?: string,
  ): Promise<OutboxRecoveryCommandResult> {
    const actor = await this.workforce.getMemberInOrg(ctx.organizationId, ctx.actorMemberId);
    if (!actor || actor.organizationId !== ctx.organizationId) {
      throw new Error('TENANT_FORBIDDEN');
    }

    await this.authorize(ctx);

    const trimmedReason = reason.trim();
    // S11: a stored result is returned only to the same actor for the same dead letter and reason.
    const binding = replayBinding(ctx.actorMemberId, RETRY_DEAD_LETTER_COMMAND, {
      outboxId,
      reason: trimmedReason,
    });
    if (idempotencyKey) {
      const existing = await this.store.findIdempotency(ctx.organizationId, idempotencyKey);
      if (existing) return openReplay<OutboxRecoveryCommandResult>(existing.resultJson, binding);
    }

    if (trimmedReason.length < 3) {
      throw new Error('VALIDATION_FAILED');
    }

    const deadLetter = await this.store.getDeadLetterInOrg(ctx.organizationId, outboxId);
    if (!deadLetter) {
      // A concurrent retry with this key may have requeued it since the first read.
      const winner = idempotencyKey
        ? await this.store.findIdempotency(ctx.organizationId, idempotencyKey)
        : null;
      if (winner) return openReplay<OutboxRecoveryCommandResult>(winner.resultJson, binding);
      throw new Error('NOT_FOUND');
    }

    let recovery: OutboxRecoveryResult;
    try {
      recovery = await this.store.recoverDeadLetterDelivery(
        {
          organizationId: ctx.organizationId,
          outboxId,
          actorMemberId: ctx.actorMemberId,
          reason: trimmedReason,
          correlationId: ctx.correlationId,
        },
        idempotencyKey
          ? { key: idempotencyKey, commandName: RETRY_DEAD_LETTER_COMMAND, binding }
          : undefined,
      );
    } catch (err) {
      // A concurrent request with this key committed first: its transaction requeued the
      // message (NOT_FOUND here) or holds the key (unique conflict).
      const lostRace = isIdempotencyConflict(err) || (err instanceof Error && err.message === 'NOT_FOUND');
      if (!idempotencyKey || !lostRace) throw err;
      const winner = await this.store.findIdempotency(ctx.organizationId, idempotencyKey);
      if (!winner) throw err;
      return openReplay<OutboxRecoveryCommandResult>(winner.resultJson, binding);
    }

    return {
      commandId: recovery.outboxId,
      correlationId: ctx.correlationId,
      data: recovery,
    };
  }

  listDeadLetters(organizationId: string, limit = 25) {
    return this.store.listDeadLetters(organizationId, limit);
  }

  getDeadLetterSummary(organizationId: string, outboxId: string) {
    return this.store.getDeadLetterInOrg(organizationId, outboxId);
  }
}

/** Audit action written by store during recovery — for documentation/tests. */
export const OUTBOX_RECOVERY_AUDIT_ACTION = 'outbox.dead_letter.recovery_requested';

export function buildRecoveryAuditPreview(
  ctx: RequestContext,
  outboxId: string,
  eventId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  return buildAuditEntry(
    ctx.organizationId,
    ctx.actorMemberId,
    OUTBOX_RECOVERY_AUDIT_ACTION,
    'outbox_message',
    outboxId,
    ctx.correlationId,
    { eventId, ...before },
    after,
  );
}
