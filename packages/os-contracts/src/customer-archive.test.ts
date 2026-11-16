import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  customerArchiveBlocked,
  DeactivatePartyPayloadSchema,
  ReactivatePartyPayloadSchema,
} from './party-commands';

describe('T03 L3 archive rules', () => {
  const none = { openOrders: 0, openCommitments: 0, openIssues: 0, openWorkItems: 0, pendingPayments: 0, unassignedPayments: 0 };

  it('any single open obligation blocks archiving', () => {
    assert.equal(customerArchiveBlocked(none), false);
    for (const key of Object.keys(none) as Array<keyof typeof none>) {
      assert.equal(customerArchiveBlocked({ ...none, [key]: 1 }), true, key);
    }
  });

  it('archive needs a version and a listed reason; "other" needs a note', () => {
    const base = { partyId: 'p1', expectedVersion: 0, reason: 'no_longer_operating' };
    assert.equal(DeactivatePartyPayloadSchema.safeParse(base).success, true);
    assert.equal(DeactivatePartyPayloadSchema.safeParse({ partyId: 'p1' }).success, false);
    assert.equal(DeactivatePartyPayloadSchema.safeParse({ ...base, reason: 'cleanup' }).success, false);
    assert.equal(DeactivatePartyPayloadSchema.safeParse({ ...base, reason: 'other' }).success, false);
    assert.equal(DeactivatePartyPayloadSchema.safeParse({ ...base, reason: 'other', reasonNote: 'Cerró su local' }).success, true);
  });

  it('reactivation needs a version and a reason of at least 10 characters', () => {
    assert.equal(ReactivatePartyPayloadSchema.safeParse({ partyId: 'p1', expectedVersion: 1, reasonNote: 'Retomó compras' }).success, true);
    assert.equal(ReactivatePartyPayloadSchema.safeParse({ partyId: 'p1', expectedVersion: 1, reasonNote: 'vuelve' }).success, false);
    assert.equal(ReactivatePartyPayloadSchema.safeParse({ partyId: 'p1', reasonNote: 'Retomó compras' }).success, false);
  });
});
