import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEffectiveScopes,
  memberHasGrantedScope,
  memberHasScope,
  isAssignmentActive,
  aiEffectiveScopes,
  delegationConfersScope,
  type DelegatorStanding,
  type EffectiveDelegation,
} from './authorization';

function holder(scope: string, over: Partial<DelegatorStanding> = {}): DelegatorStanding {
  return {
    organizationId: 'org-a',
    accessStatus: 'active',
    roleAssignments: [{ roleKey: scope, effectiveAt: new Date('2026-01-01'), endedAt: null }],
    ...over,
  };
}

describe('authorization', () => {
  // Rule 6b29ab3 / V2 §scopes: a job title (sales_rep, sales_manager) is a label, never a grant.
  it('effective roles respect asOf', () => {
    const asOf = new Date('2026-06-01');
    const scopes = computeEffectiveScopes(
      [
        {
          roleKey: 'commercial.team.read',
          effectiveAt: new Date('2026-01-01'),
          endedAt: new Date('2026-05-01'),
        },
        {
          roleKey: 'commercial.org.read',
          effectiveAt: new Date('2026-05-01'),
          endedAt: null,
        },
        {
          roleKey: 'commercial.customer.create',
          effectiveAt: new Date('2026-07-01'),
          endedAt: null,
        },
        {
          roleKey: 'sales_manager',
          effectiveAt: new Date('2026-05-01'),
          endedAt: null,
        },
      ],
      [],
      asOf,
    );
    assert.deepEqual(scopes, ['commercial.org.read']);
  });

  it('expired delegation excluded', () => {
    const asOf = new Date('2026-08-01');
    const scopes = computeEffectiveScopes(
      [{ roleKey: 'commercial.team.read', effectiveAt: new Date('2026-01-01'), endedAt: null }],
      [
        {
          scopes: ['people.admin'],
          startsAt: new Date('2026-07-01'),
          expiresAt: new Date('2026-07-15'),
          revokedAt: null,
          delegatorMemberId: 'mgr1',
        },
      ],
      asOf,
    );
    assert.deepEqual(scopes, ['commercial.team.read']);
  });

  it('active delegation grants scope', () => {
    const asOf = new Date('2026-07-10');
    const scopes = computeEffectiveScopes(
      [{ roleKey: 'sales_rep', effectiveAt: new Date('2026-01-01'), endedAt: null }],
      [
        {
          scopes: ['people.admin'],
          startsAt: new Date('2026-07-01'),
          expiresAt: new Date('2026-07-15'),
          revokedAt: null,
          delegatorMemberId: 'mgr1',
          delegator: holder('people.admin'),
        },
      ],
      asOf,
    );
    assert.ok(scopes.includes('people.admin'));
  });

  it('memberHasScope checks delegation', () => {
    assert.equal(
      memberHasScope(
        {
          memberId: 'm1',
          organizationId: 'o1',
          accessStatus: 'active',
          roleKeys: ['sales_rep'],
          delegatedScopes: ['people.admin'],
        },
        'people.admin',
      ),
      true,
    );
  });

  it('isAssignmentActive boundary', () => {
    const end = new Date('2026-05-01');
    assert.equal(isAssignmentActive(new Date('2026-01-01'), end, new Date('2026-05-01')), false);
    assert.equal(isAssignmentActive(new Date('2026-01-01'), end, new Date('2026-04-30')), true);
  });

  it('AI inherits member scopes without elevation', () => {
    const snap = {
      memberId: 'm1',
      organizationId: 'o1',
      accessStatus: 'active',
      roleKeys: ['sales_rep'],
      delegatedScopes: [],
    };
    assert.deepEqual(aiEffectiveScopes(snap), ['sales_rep']);
    assert.equal(memberHasScope(snap, 'people.admin'), false);
  });

  it('granted read scope is not an admin scope', () => {
    const snap = {
      memberId: 'm1',
      organizationId: 'o1',
      accessStatus: 'active',
      roleKeys: ['commercial.team.read', 'commercial.org.read'],
      delegatedScopes: [],
    };
    assert.equal(memberHasGrantedScope(snap, 'commercial.team.read'), true);
    assert.equal(memberHasGrantedScope(snap, 'commercial.org.read'), true);
    assert.equal(memberHasScope(snap, 'people.admin'), false);
    assert.equal(memberHasScope(snap, 'master_data.admin'), false);
    assert.equal(memberHasGrantedScope({ ...snap, accessStatus: 'suspended' }, 'commercial.org.read'), false);
  });
});

describe('F10 delegation follows its delegator', () => {
  const asOf = new Date('2026-07-10');
  const base = (over: Partial<EffectiveDelegation> = {}): EffectiveDelegation => ({
    scopes: ['people.admin'],
    startsAt: new Date('2026-07-01'),
    expiresAt: new Date('2026-07-15'),
    revokedAt: null,
    delegatorMemberId: 'mgr1',
    organizationId: 'org-a',
    delegator: holder('people.admin'),
    ...over,
  });

  it('confers the scope while the delegator is active and still holds it', () => {
    assert.equal(delegationConfersScope(base(), 'people.admin', asOf), true);
    assert.deepEqual(computeEffectiveScopes([], [base()], asOf), ['people.admin']);
  });

  it('stops when the delegator is suspended, revoked or invited', () => {
    for (const accessStatus of ['suspended', 'revoked', 'invited']) {
      const d = base({ delegator: holder('people.admin', { accessStatus }) });
      assert.deepEqual(computeEffectiveScopes([], [d], asOf), [], accessStatus);
    }
  });

  it('stops when the delegator no longer holds the scope by their own role', () => {
    const ended = base({
      delegator: holder('people.admin', {
        roleAssignments: [{ roleKey: 'people.admin', effectiveAt: new Date('2026-01-01'), endedAt: new Date('2026-07-05') }],
      }),
    });
    assert.deepEqual(computeEffectiveScopes([], [ended], asOf), []);
    const other = base({ delegator: holder('master_data.admin') });
    assert.deepEqual(computeEffectiveScopes([], [other], asOf), []);
    // Before the role ended the same delegation conferred it: history is evaluated as of the date.
    assert.deepEqual(computeEffectiveScopes([], [ended], new Date('2026-07-03')), ['people.admin']);
  });

  it('does not chain: a delegator who only holds the scope by delegation passes nothing on', () => {
    const chained = base({ delegator: holder('people.admin', { roleAssignments: [] }) });
    assert.deepEqual(computeEffectiveScopes([], [chained], asOf), []);
  });

  it('fails closed without the delegator standing or with a delegator from another organization', () => {
    assert.deepEqual(computeEffectiveScopes([], [base({ delegator: undefined })], asOf), []);
    const foreign = base({ delegator: holder('people.admin', { organizationId: 'org-b' }) });
    assert.deepEqual(computeEffectiveScopes([], [foreign], asOf), []);
  });

  it('still stops on expiry and revocation', () => {
    assert.deepEqual(computeEffectiveScopes([], [base({ revokedAt: new Date('2026-07-08') })], asOf), []);
    assert.deepEqual(computeEffectiveScopes([], [base()], new Date('2026-07-15')), []);
  });

  it('a delegator reinstated before expiry confers again (use-time evaluation, row unchanged)', () => {
    const d = base();
    assert.deepEqual(computeEffectiveScopes([], [{ ...d, delegator: holder('people.admin', { accessStatus: 'suspended' }) }], asOf), []);
    assert.deepEqual(computeEffectiveScopes([], [d], asOf), ['people.admin']);
  });
});
