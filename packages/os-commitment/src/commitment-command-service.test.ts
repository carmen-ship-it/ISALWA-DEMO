import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { deriveCommitmentState } from '@isalwa/os-contracts';
import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import {
  CommitmentCommandService,
  type CommitmentCommandName,
} from './commitment-command-service';
import type { OsCommitmentStore } from './os-commitment-store';
import type {
  CommitmentDatabaseRecord,
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
        'ownerMemberId' | 'lifecycle' | 'fulfilledAt' | 'fulfilledByMemberId' | 'cancelledAt'
      >
    >,
  ): Promise<void> {
    const c = this.commitments.get(commitmentId);
    if (c) {
      this.commitments.set(commitmentId, { ...c, ...patch });
    }
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

      await service.execute('CancelCommitment', ctx, { commitmentId });

      const commitment = store.commitments.get(commitmentId);
      assert.equal(commitment?.lifecycle, 'cancelled');
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
      });

      const commitment = store.commitments.get(commitmentId);
      assert.equal(commitment?.ownerMemberId, 'mem-2');
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
