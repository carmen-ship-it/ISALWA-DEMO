import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createId } from '@isalwa/ts-utils';
import { getOsPrisma, PrismaOsWorkforceStore } from '../index';
import * as packageIndex from '../index';
import {
  BackfillRefused,
  executeLifecycleRevivalBackfill,
  planLifecycleRevivalBackfill,
  type BackfillRequest,
} from './lifecycle-revival-backfill';

/** Synthetic organizations and members only; legacy rows written as pre-ce74648 code left them. */
const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;
const DAY = 24 * 3600 * 1000;
const NOW = new Date('2026-10-16T12:00:00.000Z');

describePrisma('lifecycle revival backfill (disposable Postgres, synthetic data, 22:20 §3)', () => {
  const prisma = () => getOsPrisma()!;
  let store: PrismaOsWorkforceStore;

  before(() => {
    store = new PrismaOsWorkforceStore(prisma());
  });

  async function fixture() {
    const slug = `bf-${createId().slice(-8)}`;
    const org = await store.seedOrganization('Backfill Synth S.R.L.', slug);
    const seed = async (name: string, accessStatus: 'active' | 'suspended' | 'revoked') => {
      const seeded = await store.seedAdminMember(org.id, `${name}-${createId().slice(-6)}@synthetic.invalid`, name, 'Synth');
      if (accessStatus !== 'active') {
        await prisma().osOrganizationMember.update({ where: { id: seeded.member.id }, data: { accessStatus } });
      }
      return seeded.member.id;
    };
    const m = {
      active: await seed('active', 'active'),
      helper: await seed('helper', 'active'),
      suspended: await seed('suspended', 'suspended'),
      removed: await seed('removed', 'revoked'),
      undated: await seed('undated', 'suspended'),
    };
    await prisma().osBusinessEvent.create({
      data: {
        id: createId(),
        organizationId: org.id,
        eventType: 'member.suspended',
        occurredAt: new Date(NOW.getTime() - 10 * DAY),
        primaryEntityType: 'organization_member',
        primaryEntityId: m.suspended,
        payloadJson: { memberId: m.suspended },
        correlationId: createId(),
      },
    });
    const delegation = async (from: string, to: string, expiresAt = new Date(NOW.getTime() + 30 * DAY), revokedAt: Date | null = null) => {
      const id = createId();
      await prisma().osDelegation.create({
        data: { id, organizationId: org.id, delegatorMemberId: from, delegateMemberId: to, scopesJson: ['people.admin'], startsAt: new Date(NOW.getTime() - 20 * DAY), expiresAt, revokedAt },
      });
      return id;
    };
    const coverage = async (owner: string, acting: string, recordedAt: Date) => {
      const id = createId();
      await prisma().osCustomerCoverageGrant.create({
        data: { id, organizationId: org.id, customerPartyId: createId(), primaryOwnerMemberId: owner, actingAdvisorMemberId: acting, startsAt: recordedAt, recordedAt },
      });
      return id;
    };
    const rows = {
      dIssuedBySuspended: await delegation(m.suspended, m.helper),
      dToRemoved: await delegation(m.active, m.removed),
      dActive: await delegation(m.active, m.helper),
      dExpired: await delegation(m.suspended, m.helper, new Date(NOW.getTime() - DAY)),
      dAlreadyRevoked: await delegation(m.suspended, m.helper, undefined, new Date(NOW.getTime() - 5 * DAY)),
      cReceivedBySuspended: await coverage(m.active, m.suspended, new Date(NOW.getTime() - 30 * DAY)),
      cIssuedByRemoved: await coverage(m.removed, m.helper, new Date(NOW.getTime() - 30 * DAY)),
      cIssuedBeforeSuspension: await coverage(m.suspended, m.helper, new Date(NOW.getTime() - 30 * DAY)),
      cIssuedDuringSuspension: await coverage(m.suspended, m.helper, new Date(NOW.getTime() - 2 * DAY)),
      cUndated: await coverage(m.undated, m.helper, new Date(NOW.getTime() - 30 * DAY)),
      cActive: await coverage(m.active, m.helper, new Date(NOW.getTime() - 30 * DAY)),
    };
    const legacyRoleId = createId();
    await prisma().osRoleAssignment.create({
      data: { id: legacyRoleId, organizationId: org.id, memberId: m.active, roleKey: 'commercial.team.read', effectiveAt: new Date(NOW.getTime() - 40 * DAY) },
    });
    await prisma().osBusinessEvent.create({
      data: {
        id: createId(),
        organizationId: org.id,
        eventType: 'member.role.changed',
        occurredAt: new Date(NOW.getTime() - 40 * DAY),
        primaryEntityType: 'organization_member',
        primaryEntityId: m.active,
        payloadJson: { memberId: m.active, roleKey: 'commercial.team.read' },
        correlationId: createId(),
      },
    });
    const request: BackfillRequest = {
      organizationId: org.id,
      organizationSlug: slug,
      approvalReference: 'SYNTHETIC-BACKFILL-APPROVAL',
      operator: 'synthetic-operator',
      reason: 'synthetic test of the lifecycle revival backfill',
    };
    return { org, m, rows, legacyRoleId, request };
  }

  const snapshot = async (organizationId: string) => ({
    delegations: await prisma().osDelegation.findMany({ where: { organizationId }, orderBy: { id: 'asc' } }),
    coverage: await prisma().osCustomerCoverageGrant.findMany({ where: { organizationId }, orderBy: { id: 'asc' } }),
    roles: await prisma().osRoleAssignment.findMany({ where: { organizationId }, orderBy: { id: 'asc' } }),
    events: await prisma().osBusinessEvent.count({ where: { organizationId } }),
  });

  it('dry run lists exactly what current lifecycle rules would have ended, lists review items, and writes nothing', async () => {
    const { org, m, rows, legacyRoleId, request } = await fixture();
    const before = await snapshot(org.id);
    const plan = await planLifecycleRevivalBackfill(prisma(), request, NOW);
    assert.deepEqual(
      plan.endDelegations.map((d) => d.delegationId).sort(),
      [rows.dIssuedBySuspended, rows.dToRemoved].sort(),
    );
    assert.deepEqual(
      Object.fromEntries(plan.endCoverage.map((c) => [c.grantId, c.basis])),
      {
        [rows.cReceivedBySuspended]: 'acting_advisor_inactive',
        [rows.cIssuedByRemoved]: 'primary_owner_removed',
        [rows.cIssuedBeforeSuspension]: 'primary_owner_suspended_before_grant_end',
      },
    );
    assert.deepEqual(plan.reviewCoverage.map((c) => [c.grantId, c.basis]), [[rows.cUndated, 'primary_owner_suspended_undated']]);
    assert.deepEqual(plan.reviewLegacyRoleChangeGrants, [
      { memberId: m.active, roleKey: 'commercial.team.read', roleAssignmentIds: [legacyRoleId], roleChangedEventId: plan.reviewLegacyRoleChangeGrants[0]!.roleChangedEventId },
    ]);
    assert.match(plan.planHash, /^[0-9a-f]{64}$/);
    assert.deepEqual(await snapshot(org.id), before, 'dry run writes nothing');
  });

  it('executes only the reviewed plan: sets revokedAt on planned rows only, keeps history, records event and audit', async () => {
    const { org, rows, request } = await fixture();
    const plan = await planLifecycleRevivalBackfill(prisma(), request, NOW);
    await assert.rejects(
      executeLifecycleRevivalBackfill(prisma(), request, 'f'.repeat(64), NOW),
      (e: unknown) => e instanceof BackfillRefused && e.reason === 'PLAN_HASH_MISMATCH',
    );
    const before = await snapshot(org.id);
    const result = await executeLifecycleRevivalBackfill(prisma(), request, plan.planHash, NOW);
    const after = await snapshot(org.id);
    const ended = new Set([...result.endedDelegationIds, ...result.endedCoverageIds]);
    for (const [i, row] of after.delegations.entries()) {
      const prior = before.delegations[i]!;
      if (ended.has(row.id)) {
        assert.deepEqual(row.revokedAt, NOW);
        assert.deepEqual({ ...row, revokedAt: null }, prior, 'only revokedAt written');
      } else {
        assert.deepEqual(row, prior, `untouched ${row.id}`);
      }
    }
    for (const [i, row] of after.coverage.entries()) {
      const prior = before.coverage[i]!;
      if (ended.has(row.id)) assert.deepEqual({ ...row, revokedAt: null }, prior);
      else assert.deepEqual(row, prior, `untouched ${row.id}`);
    }
    assert.deepEqual(after.roles, before.roles, 'review items are never written');
    for (const kept of [rows.dActive, rows.dExpired, rows.dAlreadyRevoked, rows.cIssuedDuringSuspension, rows.cUndated, rows.cActive]) {
      assert.equal(ended.has(kept), false, kept);
    }
    const audit = await prisma().osAuditLog.count({ where: { organizationId: org.id, action: 'organization.lifecycle_backfill.applied' } });
    assert.equal(audit, 1);
    assert.equal(after.events, before.events + 1);

    const again = await planLifecycleRevivalBackfill(prisma(), request, NOW);
    assert.deepEqual([again.endDelegations, again.endCoverage], [[], []], 'idempotent: nothing left to end');
    const rerun = await executeLifecycleRevivalBackfill(prisma(), request, again.planHash, NOW);
    assert.equal(rerun.eventId, null);
  });

  it('refuses missing inputs and a wrong tenant', async () => {
    const { request } = await fixture();
    await assert.rejects(
      planLifecycleRevivalBackfill(prisma(), { ...request, approvalReference: ' ' }, NOW),
      (e: unknown) => e instanceof BackfillRefused && e.reason === 'INVALID_INPUT',
    );
    await assert.rejects(
      planLifecycleRevivalBackfill(prisma(), { ...request, organizationSlug: 'another-org' }, NOW),
      (e: unknown) => e instanceof BackfillRefused && e.reason === 'WRONG_TENANT',
    );
  });

  it('is not exported from the package and not imported by any app', () => {
    assert.equal('executeLifecycleRevivalBackfill' in packageIndex, false);
    assert.equal('planLifecycleRevivalBackfill' in packageIndex, false);
    const appsDir = join(__dirname, '..', '..', '..', '..', 'apps');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === 'dist' || name === '.next') continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && /lifecycle-revival-backfill|lifecycle-backfill-cli/.test(readFileSync(path, 'utf8'))) {
          offenders.push(path);
        }
      }
    };
    walk(appsDir);
    assert.deepEqual(offenders, []);
  });
});
