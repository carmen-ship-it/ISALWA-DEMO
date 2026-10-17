import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createId } from '@isalwa/ts-utils';
import { getOsPrisma, PrismaOsWorkforceStore } from '../index';
import * as packageIndex from '../index';
import { ADDITIONAL_ASSIGNABLE_SCOPE_KEYS } from '@isalwa/os-contracts';
import {
  BOOTSTRAP_PROPOSALS,
  BootstrapRefused,
  ORGANIZATION_RANGE_SCOPES,
  executeInitialCommercialBootstrap,
  planInitialCommercialBootstrap,
  type BootstrapRequest,
} from './initial-commercial-bootstrap';

describe('bootstrap proposals (21:33 §4)', () => {
  it('no proposal grants every commercial scope; each is a small allowlisted set whose range matches its scopes', () => {
    for (const [key, proposal] of Object.entries(BOOTSTRAP_PROPOSALS)) {
      const scopes: readonly string[] = proposal.scopes;
      assert.ok(scopes.length <= 3, key);
      assert.ok(scopes.every((scope) => (ADDITIONAL_ASSIGNABLE_SCOPE_KEYS as readonly string[]).includes(scope)), key);
      const orgWide = scopes.some((scope) => ORGANIZATION_RANGE_SCOPES.includes(scope));
      assert.equal(proposal.range === 'organization', orgWide, key);
      assert.equal(scopes.includes('commercial.assignment.org'), false, key);
    }
  });
});

/** Synthetic organizations and identities only. Nothing here touches a real person. */
const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;
const SCOPES = ['commercial.org.read', 'commercial.customer.edit', 'commercial.work.manage'];

describePrisma('initial commercial bootstrap (disposable Postgres, synthetic identities)', () => {
  const prisma = () => getOsPrisma()!;
  let store: PrismaOsWorkforceStore;

  before(() => {
    store = new PrismaOsWorkforceStore(prisma());
  });

  async function fixture() {
    const slug = `boot-${createId().slice(-8)}`;
    const org = await store.seedOrganization('Bootstrap Synth S.R.L.', slug);
    const email = `gerencia-${createId().slice(-6)}@synthetic.invalid`;
    const target = await store.seedAdminMember(org.id, email, 'Synth', 'Gerencia');
    const request: BootstrapRequest = {
      organizationId: org.id,
      organizationSlug: slug,
      memberId: target.member.id,
      memberEmail: email.toUpperCase(),
      proposal: 'commercial_manager',
      range: 'organization',
      scopes: SCOPES,
      approvalReference: 'SYNTHETIC-APPROVAL-1',
      operator: 'synthetic-operator',
      reason: 'synthetic test of the initial provisioning procedure',
    };
    return { org, slug, email, target, request };
  }

  const refusedWith = (reason: string) => (error: unknown) =>
    error instanceof BootstrapRefused && error.reason === reason;

  const roleRows = (organizationId: string) => prisma().osRoleAssignment.count({ where: { organizationId } });
  const auditRows = (organizationId: string) =>
    prisma().osAuditLog.count({ where: { organizationId, action: 'member.bootstrap_grant.applied' } });

  it('dry run shows current versus proposed grants and writes nothing', async () => {
    const { org, request } = await fixture();
    const before = await roleRows(org.id);
    const plan = await planInitialCommercialBootstrap(prisma(), request);
    assert.deepEqual(plan.currentScopes, ['people.admin']);
    assert.deepEqual(plan.proposedScopes, [...SCOPES].sort());
    assert.deepEqual(plan.alreadyAppliedScopes, []);
    assert.match(plan.planHash, /^[0-9a-f]{64}$/);
    assert.equal(await roleRows(org.id), before);
  });

  it('executes only the reviewed plan, in one transaction, with event, outbox and audit', async () => {
    const { org, request, target } = await fixture();
    const plan = await planInitialCommercialBootstrap(prisma(), request);
    await assert.rejects(
      () => executeInitialCommercialBootstrap(prisma(), { ...request, scopes: SCOPES.slice(0, 2) }, plan.planHash),
      refusedWith('PLAN_HASH_MISMATCH'),
    );
    const result = await executeInitialCommercialBootstrap(prisma(), request, plan.planHash);
    assert.deepEqual(result.applied, [...SCOPES].sort());
    const rows = await prisma().osRoleAssignment.findMany({
      where: { organizationId: org.id, memberId: target.member.id, endedAt: null },
    });
    assert.deepEqual(rows.map((r) => r.roleKey).sort(), ['people.admin', ...SCOPES].sort());
    assert.ok(rows.filter((r) => r.roleKey !== 'people.admin').every((r) => r.id.startsWith(`bootstrap:${org.id}:`)));
    const event = await prisma().osBusinessEvent.findFirstOrThrow({ where: { id: result.eventId! } });
    assert.equal(event.eventType, 'member.bootstrap_grant.applied');
    assert.equal(event.actorMemberId, null);
    assert.equal(event.provenance, 'bootstrap');
    assert.equal((event.payloadJson as Record<string, unknown>).approvalReference, 'SYNTHETIC-APPROVAL-1');
    assert.equal(await prisma().osOutboxMessage.count({ where: { eventId: event.id } }), 1);
    assert.equal(await auditRows(org.id), 1);
  });

  it('is idempotent: the same plan again applies nothing and writes no second record', async () => {
    const { org, request } = await fixture();
    const plan = await planInitialCommercialBootstrap(prisma(), request);
    await executeInitialCommercialBootstrap(prisma(), request, plan.planHash);
    const rowsBefore = await roleRows(org.id);
    const again = await executeInitialCommercialBootstrap(prisma(), request, plan.planHash);
    assert.deepEqual(again, { applied: [], alreadyApplied: [...SCOPES].sort(), eventId: null });
    assert.equal(await roleRows(org.id), rowsBefore);
    assert.equal(await auditRows(org.id), 1);
  });

  it('cannot be reused as a bypass once a scope has a holder, for another member or another run', async () => {
    const { org, request } = await fixture();
    await executeInitialCommercialBootstrap(prisma(), request, (await planInitialCommercialBootstrap(prisma(), request)).planHash);
    const otherEmail = `otro-${createId().slice(-6)}@synthetic.invalid`;
    const other = await store.seedAdminMember(org.id, otherEmail, 'Synth', 'Otro');
    const second = { ...request, memberId: other.member.id, memberEmail: otherEmail, scopes: ['commercial.customer.edit'] };
    await assert.rejects(() => planInitialCommercialBootstrap(prisma(), second), refusedWith('SCOPE_ALREADY_HELD'));
  });

  it('two concurrent executions of the same plan produce one set of grants and one audit record', async () => {
    const { org, request } = await fixture();
    const plan = await planInitialCommercialBootstrap(prisma(), request);
    const results = await Promise.allSettled([
      executeInitialCommercialBootstrap(prisma(), request, plan.planHash),
      executeInitialCommercialBootstrap(prisma(), request, plan.planHash),
    ]);
    assert.ok(results.some((r) => r.status === 'fulfilled'));
    assert.equal(await prisma().osRoleAssignment.count({ where: { organizationId: org.id, id: { startsWith: 'bootstrap:' } } }), SCOPES.length);
    assert.equal(await auditRows(org.id), 1);
  });

  it('refuses wrong tenant, foreign member, ambiguous or mismatched identity, inactive member and non-allowlisted scopes', async () => {
    const a = await fixture();
    const b = await fixture();
    const cases: Array<[string, BootstrapRequest]> = [
      ['WRONG_TENANT', { ...a.request, organizationSlug: b.slug }],
      ['MEMBER_NOT_FOUND', { ...a.request, memberId: b.target.member.id }],
      ['IDENTITY_MISMATCH', { ...a.request, memberEmail: b.email }],
      ['SCOPE_NOT_ALLOWED', { ...a.request, scopes: ['people.admin'] }],
      ['SCOPE_NOT_ALLOWED', { ...a.request, scopes: ['system.admin'] }],
      ['INVALID_INPUT', { ...a.request, approvalReference: ' ' }],
      ['INVALID_INPUT', { ...a.request, scopes: [] }],
      ['INVALID_INPUT', { ...a.request, proposal: '' }],
      ['INVALID_INPUT', { ...a.request, range: '' }],
      ['INVALID_INPUT', { ...a.request, proposal: 'all' }],
      ['INVALID_INPUT', { ...a.request, scopes: undefined as unknown as string[] }],
      ['SCOPE_NOT_ALLOWED', { ...a.request, scopes: [...ADDITIONAL_ASSIGNABLE_SCOPE_KEYS] }],
      ['SCOPE_NOT_ALLOWED', { ...a.request, scopes: ['commercial.assignment.org'] }],
      ['SCOPE_NOT_ALLOWED', { ...a.request, proposal: 'team_manager', range: 'team', scopes: ['commercial.org.read'] }],
      ['RANGE_MISMATCH', { ...a.request, range: 'team' }],
    ];
    for (const [reason, request] of cases) {
      await assert.rejects(() => planInitialCommercialBootstrap(prisma(), request), refusedWith(reason), reason);
    }

    // Same email under a second provider, on another person in the organization.
    const twinEmail = `twin-${createId().slice(-6)}@synthetic.invalid`;
    const twin1 = await store.seedAdminMember(a.org.id, twinEmail, 'Twin', 'Uno');
    const twin2 = await store.seedAdminMember(a.org.id, `x-${twinEmail}`, 'Twin', 'Dos');
    await prisma().osAuthIdentity.update({ where: { id: twin2.auth.id }, data: { email: twinEmail, provider: 'synthetic-alt' } });
    await assert.rejects(
      () => planInitialCommercialBootstrap(prisma(), { ...a.request, memberId: twin1.member.id, memberEmail: twinEmail }),
      refusedWith('IDENTITY_AMBIGUOUS'),
    );

    await prisma().osOrganizationMember.update({ where: { id: a.target.member.id }, data: { accessStatus: 'suspended' } });
    await assert.rejects(() => planInitialCommercialBootstrap(prisma(), a.request), refusedWith('MEMBER_NOT_ACTIVE'));
    assert.equal(await auditRows(a.org.id), 0);
  });

  it('a team-range proposal is planned without organization-wide scopes', async () => {
    const { request } = await fixture();
    const plan = await planInitialCommercialBootstrap(prisma(), {
      ...request,
      proposal: 'team_manager',
      range: 'team',
      scopes: ['commercial.team.read', 'commercial.work.manage'],
    });
    assert.deepEqual([plan.proposal, plan.range, plan.proposedScopes], ['team_manager', 'team', ['commercial.team.read', 'commercial.work.manage']]);
    const orgPlan = await planInitialCommercialBootstrap(prisma(), request);
    assert.notEqual(plan.planHash, orgPlan.planHash);
  });

  it('is not exported from the package and not imported by any app', () => {
    assert.equal('executeInitialCommercialBootstrap' in packageIndex, false);
    assert.equal('planInitialCommercialBootstrap' in packageIndex, false);
    const appsDir = join(__dirname, '..', '..', '..', '..', 'apps');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === 'dist' || name === '.next') continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && /initial-commercial-bootstrap|bootstrap-cli/.test(readFileSync(path, 'utf8'))) {
          offenders.push(path);
        }
      }
    };
    walk(appsDir);
    assert.deepEqual(offenders, []);
  });
});
