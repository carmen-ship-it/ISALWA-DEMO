import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEffectiveScopes,
  memberHasGrantedScope,
  memberHasScope,
  isAssignmentActive,
  aiEffectiveScopes,
} from './authorization';

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
