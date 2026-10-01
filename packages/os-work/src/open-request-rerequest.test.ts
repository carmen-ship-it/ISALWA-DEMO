import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RequestContext } from '@isalwa/os-contracts';
import type { OsWorkStore } from './os-work-store';
import type { ApprovalRequestRecord, CommercialApprovalSubjectRecord } from './store-types';
import { approvalOpenClaimKey } from './open-request-claim';
import { WorkCommandService } from './work-command-service';

/**
 * D2 — the open-request claim key is also used as the business event's
 * idempotency key, but os_business_events has a unique index on
 * (organization_id, idempotency_key) and resolving a request only deletes the
 * os_idempotency_keys row. The claim key therefore stays burned forever and a
 * second request for the same subject fails instead of opening a new review.
 */

const ORG = 'org-a';
const OWNER = 'mem-owner';
const APPROVER = 'mem-approver';
const NOW = new Date('2026-09-13T12:00:00.000Z');

type RecordedEvent = {
  eventType: string;
  idempotencyKey?: string | null;
};

function ctx(actorMemberId: string, correlationId: string): RequestContext {
  return {
    organizationId: ORG,
    actorMemberId,
    personId: `person-${actorMemberId}`,
    authIdentityId: `auth-${actorMemberId}`,
    correlationId,
    effectiveAt: NOW,
  };
}

function subject(id = 'subject-1'): CommercialApprovalSubjectRecord {
  return {
    id,
    organizationId: ORG,
    ownerMemberId: OWNER,
    status: 'submitted',
    partyId: 'party-1',
  };
}

/**
 * Mirrors the two database constraints that matter here: the unique index on
 * business-event idempotency keys, and idempotency rows that disappear when a
 * request is resolved.
 */
function rerequestStore() {
  const approvals: ApprovalRequestRecord[] = [];
  const events: RecordedEvent[] = [];
  const idempotency = new Map<string, Record<string, unknown>>();
  const usedEventKeys = new Set<string>();

  const store = {
    approvals,
    events,
    idempotency,
    async runInTransaction(fn: (store: OsWorkStore) => Promise<unknown>) {
      const snapshot = {
        approvals: approvals.map((row) => ({ ...row })),
        events: [...events],
        idempotency: new Map(idempotency),
        usedEventKeys: new Set(usedEventKeys),
      };
      try {
        return await fn(store as unknown as OsWorkStore);
      } catch (err) {
        // A failed transaction commits nothing.
        approvals.splice(0, approvals.length, ...snapshot.approvals);
        events.splice(0, events.length, ...snapshot.events);
        idempotency.clear();
        for (const [key, value] of snapshot.idempotency) idempotency.set(key, value);
        usedEventKeys.clear();
        for (const key of snapshot.usedEventKeys) usedEventKeys.add(key);
        throw err;
      }
    },
    async getMemberInOrg(organizationId: string, memberId: string) {
      if (organizationId !== ORG) return null;
      return { id: memberId, organizationId, accessStatus: 'active' };
    },
    async listRoleAssignmentsForMember() {
      return [];
    },
    async listDelegationsForDelegate() {
      return [];
    },
    async partyExistsInOrg() {
      return false;
    },
    async getQuoteApprovalSubject(organizationId: string, quoteId: string) {
      if (organizationId !== ORG || !['subject-1', 'subject-2'].includes(quoteId)) return null;
      return subject(quoteId);
    },
    async getOrderApprovalSubject() {
      return null;
    },
    async listApprovalsForSubject() {
      return approvals;
    },
    async insertApprovalRequest(request: ApprovalRequestRecord) {
      approvals.push(request);
    },
    async getApprovalRequest(organizationId: string, approvalRequestId: string) {
      return (
        approvals.find((row) => row.organizationId === organizationId && row.id === approvalRequestId) ??
        null
      );
    },
    async decidePendingApprovalRequest(
      organizationId: string,
      approvalRequestId: string,
      patch: Pick<
        ApprovalRequestRecord,
        'status' | 'decisionByMemberId' | 'decisionReason' | 'decidedAt'
      >,
    ) {
      const row = approvals.find(
        (item) => item.organizationId === organizationId && item.id === approvalRequestId,
      );
      if (!row || row.status !== 'pending') return false;
      Object.assign(row, patch);
      return true;
    },
    async appendEventAndAudit(event: { eventType: string; idempotencyKey?: string | null }) {
      // os_business_events: @@unique([organizationId, idempotencyKey])
      if (event.idempotencyKey) {
        const key = `${ORG}:${event.idempotencyKey}`;
        if (usedEventKeys.has(key)) {
          const err = new Error('Unique constraint failed on the fields: (`idempotency_key`)');
          (err as Error & { code?: string }).code = 'P2002';
          throw err;
        }
        usedEventKeys.add(key);
      }
      events.push({ eventType: event.eventType, idempotencyKey: event.idempotencyKey ?? null });
    },
    async findIdempotency(organizationId: string, key: string) {
      const row = idempotency.get(`${organizationId}:${key}`);
      return row ? { resultJson: row } : null;
    },
    async saveIdempotency(input: { organizationId: string; key: string; resultJson: Record<string, unknown> }) {
      // os_idempotency_keys: @@unique([organizationId, key])
      const slot = `${input.organizationId}:${input.key}`;
      if (idempotency.has(slot)) {
        const err = new Error('Unique constraint failed on the fields: (`key`)');
        (err as Error & { code?: string }).code = 'P2002';
        throw err;
      }
      idempotency.set(slot, input.resultJson);
    },
    async deleteIdempotency(organizationId: string, key: string) {
      idempotency.delete(`${organizationId}:${key}`);
    },
  };

  return store;
}

describe('re-requesting a review after it is resolved', () => {
  it('does not spend the open-request claim key on the business event', async () => {
    const store = rerequestStore();
    const service = new WorkCommandService(store as unknown as OsWorkStore);

    await service.execute('RequestApproval', ctx(OWNER, 'corr-1'), {
      approverMemberId: APPROVER,
      subjectType: 'quote',
      subjectId: 'subject-1',
    });

    const claimKey = approvalOpenClaimKey('quote', 'subject-1');
    assert.ok(claimKey);
    const requested = store.events.find((e) => e.eventType === 'approval.requested');
    assert.ok(requested, 'the request must record an event');
    assert.notEqual(
      requested.idempotencyKey,
      claimKey,
      'the claim key must stay in the idempotency table, not be burned on the event',
    );
  });

  it('allows a new request after the previous one is decided', async () => {
    const store = rerequestStore();
    const service = new WorkCommandService(store as unknown as OsWorkStore);

    const first = await service.execute('RequestApproval', ctx(OWNER, 'corr-1'), {
      approverMemberId: APPROVER,
      subjectType: 'quote',
      subjectId: 'subject-1',
    });

    await service.execute('Approve', ctx(APPROVER, 'corr-2'), {
      approvalRequestId: first.data.approvalRequestId as string,
    });

    // Resolving released the claim, so a fresh review may be opened.
    await service.execute('RequestApproval', ctx(OWNER, 'corr-3'), {
      approverMemberId: APPROVER,
      subjectType: 'quote',
      subjectId: 'subject-1',
    });

    const requests = store.events.filter((e) => e.eventType === 'approval.requested');
    assert.equal(requests.length, 2, 'the second request must record its own event');
    assert.equal(store.approvals.length, 2);
    assert.equal(store.approvals[1]?.status, 'pending');
  });

  /**
   * D4 — the key used to live in an instance field on a singleton service, so a
   * second request overwrote it while the first was still inside its
   * transaction and the first event was stamped with the wrong key.
   */
  it('keeps each concurrent command on its own idempotency key', async () => {
    const store = rerequestStore();
    let release: (() => void) | undefined;
    const firstIsInsideItsTransaction = new Promise<void>((resolve) => {
      release = resolve;
    });
    const insert = store.insertApprovalRequest.bind(store);
    let held = false;
    store.insertApprovalRequest = async (request: ApprovalRequestRecord) => {
      await insert(request);
      if (held) return;
      held = true;
      // Hand control to the second command before the first one emits its event.
      release?.();
      await new Promise((resolve) => setTimeout(resolve, 5));
    };
    const service = new WorkCommandService(store as unknown as OsWorkStore);

    const first = service.execute(
      'RequestApproval',
      ctx(OWNER, 'corr-1'),
      { approverMemberId: APPROVER, subjectType: 'quote', subjectId: 'subject-1' },
      'caller-key-first',
    );
    await firstIsInsideItsTransaction;
    const second = service.execute(
      'RequestApproval',
      ctx(OWNER, 'corr-2'),
      { approverMemberId: APPROVER, subjectType: 'quote', subjectId: 'subject-2' },
      'caller-key-second',
    );
    await Promise.all([first, second]);

    const keys = store.events
      .filter((e) => e.eventType === 'approval.requested')
      .map((e) => e.idempotencyKey);
    assert.deepEqual(
      [...keys].sort(),
      ['caller-key-first', 'caller-key-second'],
      'neither command may inherit the other command\'s key',
    );
  });

  it('still replays an identical in-flight request instead of opening a second one', async () => {
    const store = rerequestStore();
    const service = new WorkCommandService(store as unknown as OsWorkStore);

    const first = await service.execute('RequestApproval', ctx(OWNER, 'corr-1'), {
      approverMemberId: APPROVER,
      subjectType: 'quote',
      subjectId: 'subject-1',
    });
    const replay = await service.execute('RequestApproval', ctx(OWNER, 'corr-2'), {
      approverMemberId: APPROVER,
      subjectType: 'quote',
      subjectId: 'subject-1',
    });

    assert.equal(replay.data.approvalRequestId, first.data.approvalRequestId);
    assert.equal(store.approvals.length, 1, 'the open claim must still prevent a duplicate review');
  });
});
