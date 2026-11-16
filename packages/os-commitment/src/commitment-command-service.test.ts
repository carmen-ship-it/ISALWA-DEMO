import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { deriveCommitmentState } from '@isalwa/os-contracts';
import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import {
  CommitmentCommandService,
  type CommitmentCommandName,
  type CommitmentReassignGuard,
} from './commitment-command-service';
import type { OsCommitmentStore } from './os-commitment-store';
import type {
  CommitmentChangeRecord,
  CommitmentDatabaseRecord,
  CommitmentNoticeRecord,
  DelegationRecord,
  IdempotencyRecord,
  MemberRecord,
  RoleAssignmentRecord,
} from './store-types';

class InMemoryCommitmentStore implements OsCommitmentStore {
  members = new Map<string, MemberRecord>();
  roles = new Map<string, RoleAssignmentRecord[]>();
  delegations = new Map<string, DelegationRecord[]>();
  parties = new Set<string>();
  commitments = new Map<string, CommitmentDatabaseRecord>();
  events: StoredBusinessEvent[] = [];
  changes: CommitmentChangeRecord[] = [];
  notices: Array<CommitmentNoticeRecord & { resolved: boolean }> = [];
  idempotency = new Map<string, IdempotencyRecord>();

  async runInTransaction<T>(fn: (store: OsCommitmentStore) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null> {
    const m = this.members.get(memberId);
    return m && m.organizationId === organizationId ? m : null;
  }

  async listRoleAssignmentsForMember(memberId: string, organizationId?: string): Promise<RoleAssignmentRecord[]> {
    return this.roles.get(memberId) ?? [];
  }

  async listDelegationsForDelegate(memberId: string, organizationId?: string): Promise<DelegationRecord[]> {
    return this.delegations.get(memberId) ?? [];
  }

  async partyExistsInOrg(organizationId: string, partyId: string): Promise<boolean> {
    return this.parties.has(`${organizationId}:${partyId}`);
  }

  async insertCommitment(record: CommitmentDatabaseRecord): Promise<void> {
    this.commitments.set(record.id, record);
  }

  async getCommitmentInOrg(organizationId: string, commitmentId: string): Promise<CommitmentDatabaseRecord | null> {
    const c = this.commitments.get(commitmentId);
    return c && c.organizationId === organizationId ? c : null;
  }

  async updateCommitment(
    commitmentId: string,
    patch: Partial<
      Pick<
        CommitmentDatabaseRecord,
        'ownerMemberId' | 'dueAt' | 'lifecycle' | 'fulfilledAt' | 'fulfilledByMemberId' | 'cancelledAt'
      >
    >,
  ): Promise<void> {
    const c = this.commitments.get(commitmentId);
    if (c) {
      this.commitments.set(commitmentId, { ...c, ...patch });
    }
  }

  async updateOpenCommitment(
    organizationId: string,
    commitmentId: string,
    expectedOwnerMemberId: string,
    patch: Partial<
      Pick<
        CommitmentDatabaseRecord,
        'ownerMemberId' | 'dueAt' | 'lifecycle' | 'fulfilledAt' | 'fulfilledByMemberId' | 'cancelledAt'
      >
    >,
  ): Promise<boolean> {
    const c = this.commitments.get(commitmentId);
    if (!c || c.organizationId !== organizationId || c.lifecycle !== 'open' || c.ownerMemberId !== expectedOwnerMemberId) {
      return false;
    }
    this.commitments.set(commitmentId, { ...c, ...patch });
    return true;
  }

  async insertCommitmentChange(change: CommitmentChangeRecord): Promise<void> {
    this.changes.push(change);
  }

  async admitCommitmentNotice(notice: CommitmentNoticeRecord): Promise<void> {
    const open = this.notices.some(
      (n) =>
        !n.resolved &&
        n.recipientMemberId === notice.recipientMemberId &&
        n.dedupKey === notice.dedupKey,
    );
    if (!open) this.notices.push({ ...notice, resolved: false });
  }

  async resolveCommitmentNotices(
    organizationId: string,
    commitmentId: string,
    options: { kinds?: readonly string[]; exceptRecipientMemberId?: string } = {},
  ): Promise<number> {
    let count = 0;
    for (const n of this.notices) {
      if (n.resolved || n.organizationId !== organizationId || n.commitmentId !== commitmentId) continue;
      if (options.kinds && !options.kinds.includes(n.kind)) continue;
      if (options.exceptRecipientMemberId && n.recipientMemberId === options.exceptRecipientMemberId) continue;
      n.resolved = true;
      count += 1;
    }
    return count;
  }

  async listCommitmentsForParty(organizationId: string, partyId: string): Promise<CommitmentDatabaseRecord[]> {
    return Array.from(this.commitments.values()).filter(
      (c) => c.organizationId === organizationId && c.partyId === partyId,
    );
  }

  async listCommitmentsForOwner(
    organizationId: string,
    ownerMemberId: string,
    lifecycle?: 'open' | 'fulfilled' | 'cancelled',
  ): Promise<CommitmentDatabaseRecord[]> {
    return Array.from(this.commitments.values()).filter(
      (c) =>
        c.organizationId === organizationId &&
        c.ownerMemberId === ownerMemberId &&
        (!lifecycle || c.lifecycle === lifecycle),
    );
  }

  async listCommitmentsInOrg(
    organizationId: string,
    lifecycle?: 'open' | 'fulfilled' | 'cancelled',
  ): Promise<CommitmentDatabaseRecord[]> {
    return Array.from(this.commitments.values()).filter(
      (c) => c.organizationId === organizationId && (!lifecycle || c.lifecycle === lifecycle),
    );
  }

  async appendEventAndAudit(event: StoredBusinessEvent, outbox: StoredOutboxMessage, audit: StoredAuditLog): Promise<void> {
    this.events.push(event);
  }

  async findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null> {
    return this.idempotency.get(`${organizationId}:${key}`) ?? null;
  }

  async saveIdempotency(record: IdempotencyRecord & { id?: string }): Promise<void> {
    this.idempotency.set(`${record.organizationId}:${record.key}`, record);
  }
}

function makeContext(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    organizationId: 'org-1',
    actorMemberId: 'mem-1',
    personId: 'person-1',
    authIdentityId: 'auth-1',
    effectiveAt: new Date('2026-09-15T12:00:00.000Z'),
    correlationId: createId(),
    ...overrides,
  };
}

describe('CommitmentCommandService', () => {
  let store: InMemoryCommitmentStore;
  let service: CommitmentCommandService;

  beforeEach(() => {
    store = new InMemoryCommitmentStore();
    service = new CommitmentCommandService(store);
    
    // Set up a basic member
    store.members.set('mem-1', {
      id: 'mem-1',
      organizationId: 'org-1',
      accessStatus: 'active',
    });
    store.members.set('mem-2', {
      id: 'mem-2',
      organizationId: 'org-1',
      accessStatus: 'active',
    });
    store.parties.add('org-1:party-1');
  });

  describe('CreateEmployeeCommitment', () => {
    it('creates a commitment for the current member', async () => {
      const ctx = makeContext();
      const result = await service.execute('CreateEmployeeCommitment', ctx, {
        text: 'Llamar al cliente mañana',
        dueAt: '2026-09-16T04:00:00.000Z',
        partyId: 'party-1',
      });

      assert.ok(result.commandId);
      assert.equal(store.commitments.size, 1);
      const commitment = Array.from(store.commitments.values())[0]!;
      assert.equal(commitment.text, 'Llamar al cliente mañana');
      assert.equal(commitment.ownerMemberId, 'mem-1');
      assert.equal(commitment.lifecycle, 'open');
      assert.equal(commitment.origin, 'employee_entered');
    });

    it('rejects if actor is not a member', async () => {
      const ctx = makeContext({ actorMemberId: 'unknown' });
      await assert.rejects(
        service.execute('CreateEmployeeCommitment', ctx, { text: 'Test' }),
        /TENANT_FORBIDDEN/,
      );
    });

    it('rejects if party does not exist', async () => {
      const ctx = makeContext();
      await assert.rejects(
        service.execute('CreateEmployeeCommitment', ctx, {
          text: 'Test',
          partyId: 'nonexistent-party',
        }),
        /NOT_FOUND/,
      );
    });
  });

  describe('FulfillCommitment', () => {
    it('marks a commitment as fulfilled by owner', async () => {
      const ctx = makeContext();
      await service.execute('CreateEmployeeCommitment', ctx, {
        text: 'Deliver order',
      });
      const commitmentId = Array.from(store.commitments.keys())[0]!;

      await service.execute('FulfillCommitment', ctx, { commitmentId });

      const commitment = store.commitments.get(commitmentId);
      assert.equal(commitment?.lifecycle, 'fulfilled');
      assert.ok(commitment?.fulfilledAt);
      assert.equal(commitment?.fulfilledByMemberId, 'mem-1');
    });

    it('rejects fulfillment by non-owner', async () => {
      const ctx = makeContext();
      await service.execute('CreateEmployeeCommitment', ctx, {
        text: 'My commitment',
      });
      const commitmentId = Array.from(store.commitments.keys())[0]!;

      const otherCtx = makeContext({ actorMemberId: 'mem-2' });
      await assert.rejects(
        service.execute('FulfillCommitment', otherCtx, { commitmentId }),
        /PERMISSION_DENIED/,
      );
    });
  });

  describe('CancelCommitment', () => {
    it('marks a commitment as cancelled by owner', async () => {
      const ctx = makeContext();
      await service.execute('CreateEmployeeCommitment', ctx, {
        text: 'Will not happen',
      });
      const commitmentId = Array.from(store.commitments.keys())[0]!;

      await service.execute('CancelCommitment', ctx, { commitmentId, reason: 'El cliente ya no lo pidió' });

      const commitment = store.commitments.get(commitmentId);
      assert.equal(commitment?.lifecycle, 'cancelled');
      assert.equal(store.changes.length, 1);
      assert.equal(store.changes[0]!.kind, 'cancelled');
      assert.equal(store.changes[0]!.reason, 'El cliente ya no lo pidió');
      assert.equal(store.changes[0]!.actorMemberId, 'mem-1');
    });

    it('requires a reason and keeps the commitment open without one', async () => {
      const ctx = makeContext();
      await service.execute('CreateEmployeeCommitment', ctx, { text: 'Sin motivo' });
      const commitmentId = Array.from(store.commitments.keys())[0]!;

      await assert.rejects(service.execute('CancelCommitment', ctx, { commitmentId }), /VALIDATION_FAILED/);
      await assert.rejects(
        service.execute('CancelCommitment', ctx, { commitmentId, reason: '   ' }),
        /VALIDATION_FAILED/,
      );
      assert.equal(store.commitments.get(commitmentId)?.lifecycle, 'open');
      assert.equal(store.changes.length, 0);
    });

    it('a cancelled commitment cannot be fulfilled, rescheduled or cancelled again', async () => {
      const ctx = makeContext();
      await service.execute('CreateEmployeeCommitment', ctx, { text: 'Cerrado' });
      const commitmentId = Array.from(store.commitments.keys())[0]!;
      await service.execute('CancelCommitment', ctx, { commitmentId, reason: 'Ya no aplica' });

      await assert.rejects(service.execute('FulfillCommitment', ctx, { commitmentId }), /VALIDATION_FAILED/);
      await assert.rejects(
        service.execute('RescheduleCommitment', ctx, {
          commitmentId,
          dueAt: '2026-09-20T16:00:00.000Z',
          reason: 'Tarde',
        }),
        /VALIDATION_FAILED/,
      );
      await assert.rejects(
        service.execute('CancelCommitment', ctx, { commitmentId, reason: 'Otra vez' }),
        /VALIDATION_FAILED/,
      );
    });
  });

  describe('RescheduleCommitment', () => {
    const OLD = '2026-09-16T16:00:00.000Z';
    const NEW = '2026-09-18T20:00:00.000Z';

    async function open(ctx = makeContext()) {
      await service.execute('CreateEmployeeCommitment', ctx, { text: 'Entregar muestra', dueAt: OLD });
      return Array.from(store.commitments.keys())[0]!;
    }

    it('moves the deadline and keeps the previous deadline, actor and reason', async () => {
      const commitmentId = await open();
      await service.execute('RescheduleCommitment', makeContext(), {
        commitmentId,
        dueAt: NEW,
        reason: 'El cliente pidió más tiempo',
      });
      assert.equal(store.commitments.get(commitmentId)!.dueAt!.toISOString(), NEW);
      assert.equal(store.changes.length, 1);
      const change = store.changes[0]!;
      assert.equal(change.kind, 'rescheduled');
      assert.equal(change.previousDueAt!.toISOString(), OLD);
      assert.equal(change.newDueAt!.toISOString(), NEW);
      assert.equal(change.actorMemberId, 'mem-1');
      assert.equal(change.reason, 'El cliente pidió más tiempo');
    });

    it('a second change keeps the first deadline in history', async () => {
      const commitmentId = await open();
      const ctx = makeContext();
      await service.execute('RescheduleCommitment', ctx, { commitmentId, dueAt: NEW, reason: 'Primero' });
      await service.execute('RescheduleCommitment', ctx, {
        commitmentId,
        dueAt: '2026-09-25T16:00:00.000Z',
        reason: 'Segundo',
      });
      assert.deepEqual(
        store.changes.map((c) => c.previousDueAt!.toISOString()),
        [OLD, NEW],
      );
    });

    it('rejects a missing reason, an unchanged instant and a non-owner without writing', async () => {
      const commitmentId = await open();
      const ctx = makeContext();
      await assert.rejects(
        service.execute('RescheduleCommitment', ctx, { commitmentId, dueAt: NEW }),
        /VALIDATION_FAILED/,
      );
      await assert.rejects(
        service.execute('RescheduleCommitment', ctx, { commitmentId, dueAt: OLD, reason: 'Igual' }),
        /VALIDATION_FAILED/,
      );
      await assert.rejects(
        service.execute('RescheduleCommitment', makeContext({ actorMemberId: 'mem-2' }), {
          commitmentId,
          dueAt: NEW,
          reason: 'No es mío',
        }),
        /PERMISSION_DENIED/,
      );
      assert.equal(store.commitments.get(commitmentId)!.dueAt!.toISOString(), OLD);
      assert.equal(store.changes.length, 0);
      assert.equal(store.events.filter((e) => e.eventType === 'commitment.rescheduled').length, 0);
    });

    it('closes the stale due notice so it is not delivered for the old date', async () => {
      const commitmentId = await open();
      store.notices.push({
        id: 'n-due',
        organizationId: 'org-1',
        recipientMemberId: 'mem-1',
        kind: 'commitment_due' as never,
        dedupKey: `commitment_due:commitment:${commitmentId}`,
        title: 'Compromiso para hoy',
        body: null,
        commitmentId,
        partyId: null,
        resolved: false,
      });
      await service.execute('RescheduleCommitment', makeContext(), { commitmentId, dueAt: NEW, reason: 'Se movió' });
      assert.equal(store.notices.find((n) => n.id === 'n-due')!.resolved, true);
    });
  });

  describe('notices', () => {
    it('tells the responsible person when someone else records the commitment, not when they record their own', async () => {
      const ctx = makeContext();
      await service.execute('CreateEmployeeCommitment', ctx, { text: 'Para otro', ownerMemberId: 'mem-2' });
      await service.execute('CreateEmployeeCommitment', ctx, { text: 'Para mí' });
      assert.equal(store.notices.length, 1);
      assert.equal(store.notices[0]!.recipientMemberId, 'mem-2');
      assert.equal(store.notices[0]!.kind, 'commitment_assigned');
    });

    it('moves the notice with the responsibility and closes the one for the previous owner', async () => {
      const ctx = makeContext();
      await service.execute('CreateEmployeeCommitment', ctx, { text: 'Para otro', ownerMemberId: 'mem-2' });
      const commitmentId = Array.from(store.commitments.keys())[0]!;
      store.members.set('mem-3', { id: 'mem-3', organizationId: 'org-1', accessStatus: 'active' });

      await service.execute('ReassignCommitmentOwner', makeContext({ actorMemberId: 'mem-2' }), {
        commitmentId,
        newOwnerMemberId: 'mem-3',
        reason: 'Salgo de viaje',
      });

      const forTwo = store.notices.filter((n) => n.recipientMemberId === 'mem-2' && n.kind === 'commitment_assigned');
      assert.equal(forTwo.every((n) => n.resolved), true);
      const forThree = store.notices.filter((n) => n.recipientMemberId === 'mem-3' && !n.resolved);
      assert.equal(forThree.length, 1);
      assert.equal(forThree[0]!.kind, 'commitment_assigned');
    });

    it('fulfilling closes every open notice', async () => {
      const ctx = makeContext({ actorMemberId: 'mem-2' });
      await service.execute('CreateEmployeeCommitment', makeContext(), { text: 'Para otro', ownerMemberId: 'mem-2' });
      const commitmentId = Array.from(store.commitments.keys())[0]!;
      await service.execute('FulfillCommitment', ctx, { commitmentId, note: 'Entregado' });
      assert.equal(store.notices.every((n) => n.resolved), true);
      assert.equal(store.changes[0]!.kind, 'fulfilled');
      assert.equal(store.changes[0]!.reason, 'Entregado');
    });
  });

  describe('ReassignCommitmentOwner', () => {
    it('allows owner to reassign commitment', async () => {
      const ctx = makeContext();
      await service.execute('CreateEmployeeCommitment', ctx, {
        text: 'Handoff task',
      });
      const commitmentId = Array.from(store.commitments.keys())[0]!;

      await service.execute('ReassignCommitmentOwner', ctx, {
        commitmentId,
        newOwnerMemberId: 'mem-2',
        reason: 'Pasa a otra persona',
      });

      const commitment = store.commitments.get(commitmentId);
      assert.equal(commitment?.ownerMemberId, 'mem-2');
      assert.equal(store.changes.length, 1);
      assert.equal(store.changes[0]!.previousOwnerMemberId, 'mem-1');
      assert.equal(store.changes[0]!.newOwnerMemberId, 'mem-2');
      assert.equal(store.changes[0]!.reason, 'Pasa a otra persona');
    });

    it('requires a reason, an active target and a different owner', async () => {
      const ctx = makeContext();
      await service.execute('CreateEmployeeCommitment', ctx, { text: 'Handoff task' });
      const commitmentId = Array.from(store.commitments.keys())[0]!;
      store.members.set('mem-s', { id: 'mem-s', organizationId: 'org-1', accessStatus: 'suspended' });

      await assert.rejects(
        service.execute('ReassignCommitmentOwner', ctx, { commitmentId, newOwnerMemberId: 'mem-2' }),
        /VALIDATION_FAILED/,
      );
      await assert.rejects(
        service.execute('ReassignCommitmentOwner', ctx, { commitmentId, newOwnerMemberId: 'mem-s', reason: 'Suspendido' }),
        /VALIDATION_FAILED/,
      );
      await assert.rejects(
        service.execute('ReassignCommitmentOwner', ctx, { commitmentId, newOwnerMemberId: 'mem-1', reason: 'Mismo' }),
        /VALIDATION_FAILED/,
      );
      assert.equal(store.commitments.get(commitmentId)?.ownerMemberId, 'mem-1');
      assert.equal(store.changes.length, 0);
    });

    it('a manager granted by the guard can hand over a suspended owner commitment; the target must be eligible', async () => {
      const guarded = new CommitmentCommandService(store, null, {
        async authority(ctx) {
          return ctx.actorMemberId === 'mem-boss' ? { kind: 'customer_manager', range: 'org' } : null;
        },
        async mayHold(_ctx, _commitment, targetMemberId) {
          return targetMemberId === 'mem-2';
        },
      } satisfies CommitmentReassignGuard);
      store.members.set('mem-boss', { id: 'mem-boss', organizationId: 'org-1', accessStatus: 'active' });
      store.members.set('mem-4', { id: 'mem-4', organizationId: 'org-1', accessStatus: 'active' });
      await guarded.execute('CreateEmployeeCommitment', makeContext(), { text: 'Del que se fue' });
      const commitmentId = Array.from(store.commitments.keys())[0]!;
      store.members.set('mem-1', { id: 'mem-1', organizationId: 'org-1', accessStatus: 'suspended' });
      const boss = makeContext({ actorMemberId: 'mem-boss' });

      await assert.rejects(
        guarded.execute('ReassignCommitmentOwner', boss, { commitmentId, newOwnerMemberId: 'mem-4', reason: 'Sin acceso' }),
        /TARGET_PREREQUISITE_MISSING/,
      );
      assert.equal(store.commitments.get(commitmentId)?.ownerMemberId, 'mem-1');

      await guarded.execute('ReassignCommitmentOwner', boss, {
        commitmentId,
        newOwnerMemberId: 'mem-2',
        reason: 'Cubre la cuenta',
      });
      assert.equal(store.commitments.get(commitmentId)?.ownerMemberId, 'mem-2');
      assert.equal(store.changes[0]!.actorMemberId, 'mem-boss');
      assert.equal(store.changes[0]!.previousOwnerMemberId, 'mem-1');

      // A non-owner the guard does not name stays refused.
      await assert.rejects(
        guarded.execute('ReassignCommitmentOwner', makeContext({ actorMemberId: 'mem-4' }), {
          commitmentId,
          newOwnerMemberId: 'mem-4',
          reason: 'Me lo quedo',
        }),
        /PERMISSION_DENIED/,
      );
    });

    it('rejects reassignment by non-owner (no people.admin fallback)', async () => {
      const ctx = makeContext();
      await service.execute('CreateEmployeeCommitment', ctx, {
        text: 'My task',
      });
      const commitmentId = Array.from(store.commitments.keys())[0]!;

      const otherCtx = makeContext({ actorMemberId: 'mem-2' });
      await assert.rejects(
        service.execute('ReassignCommitmentOwner', otherCtx, {
          commitmentId,
          newOwnerMemberId: 'mem-1',
          reason: 'No me corresponde',
        }),
        /PERMISSION_DENIED/,
      );
    });
  });

  describe('customer_reported origin does NOT imply payment confirmed', () => {
    it('CreateCustomerReportedCommitment creates commitment without payment status', async () => {
      const ctx = makeContext();
      const result = await service.execute('CreateCustomerReportedCommitment', ctx, {
        text: 'Customer said they will pay on Friday',
        partyId: 'party-1',
      });

      assert.ok(result.commandId);
      const commitment = Array.from(store.commitments.values())[0]!;
      
      // Commitment exists but has no payment confirmation field
      assert.equal(commitment.text, 'Customer said they will pay on Friday');
      assert.equal(commitment.origin, 'customer_reported');
      // No paymentConfirmed field should exist
      assert.ok(!('paymentConfirmed' in commitment));
      // lifecycle is open, not anything payment-related
      assert.equal(commitment.lifecycle, 'open');
    });
  });

  describe('overdue derivation', () => {
    it('derives state from dueAt and Bolivia calendar day', async () => {
      const ctx = makeContext();
      
      // Create a commitment due yesterday (in Bolivia time)
      await service.execute('CreateEmployeeCommitment', ctx, {
        text: 'Overdue task',
        dueAt: '2026-09-14T04:00:00.000Z', // Midnight Sep 14 Bolivia
      });
      const commitmentId = Array.from(store.commitments.keys())[0]!;
      const commitment = store.commitments.get(commitmentId)!

      // Convert to contract record for state derivation
      const contractRecord = {
        id: commitment!.id,
        organizationId: commitment!.organizationId,
        partyId: commitment!.partyId,
        ownerMemberId: commitment!.ownerMemberId,
        text: commitment!.text,
        dueAt: commitment!.dueAt?.toISOString() ?? null,
        origin: commitment!.origin,
        relatedSubjectType: commitment!.relatedSubjectType,
        relatedSubjectId: commitment!.relatedSubjectId,
        lifecycle: commitment!.lifecycle,
        createdByMemberId: commitment!.createdByMemberId,
        createdAt: commitment!.createdAt.toISOString(),
        fulfilledAt: commitment!.fulfilledAt?.toISOString() ?? null,
        cancelledAt: commitment!.cancelledAt?.toISOString() ?? null,
        provenanceSuggestionId: commitment!.provenanceSuggestionId,
        canonical: true as const,
      };

      // As of Sep 15 noon Bolivia, due date of Sep 14 should be overdue
      const state = deriveCommitmentState(contractRecord, new Date('2026-09-15T16:00:00.000Z'));
      assert.equal(state, 'overdue');
    });
  });
});
