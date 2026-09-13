import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEffectiveScopes,
  memberHasScope,
  isAssignmentActive,
  aiEffectiveScopes,
} from './authorization';

describe('authorization', () => {
  it('effective roles respect asOf', () => {
    const asOf = new Date('2026-06-01');
    const scopes = computeEffectiveScopes(
      [
        {
          roleKey: 'sales_rep',
          effectiveAt: new Date('2026-01-01'),
          endedAt: new Date('2026-05-01'),
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
    assert.deepEqual(scopes, ['sales_manager']);
  });

  it('expired delegation excluded', () => {
    const asOf = new Date('2026-08-01');
    const scopes = computeEffectiveScopes(
      [{ roleKey: 'sales_rep', effectiveAt: new Date('2026-01-01'), endedAt: null }],
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
    assert.deepEqual(scopes, ['sales_rep']);
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
});
