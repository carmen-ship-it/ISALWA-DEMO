import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createId } from '@isalwa/ts-utils';
import { computeEffectiveScopes } from '@isalwa/os-domain';
import { getOsPrisma, PrismaOsWorkforceStore } from '../index';
import * as packageIndex from '../index';
import { ADDITIONAL_ASSIGNABLE_SCOPE_KEYS } from '@isalwa/os-contracts';
import {
  BOOTSTRAP_PROPOSALS,
  BootstrapRefused,
  ORGANIZATION_RANGE_SCOPES,
  executeInitialCommercialBootstrap,
  planInitialCommercialBootstrap,
  type BootstrapHolderRequest,
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
      assert.equal(scopes.includes('people.admin'), false, key);
    }
  });
});

/** Synthetic organizations and identities only. Nothing here touches a real person. */
const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;
const MANAGER_SCOPES = ['commercial.customer.edit', 'commercial.org.read', 'commercial.work.manage'];
const TEAM_SCOPES = ['commercial.customer.edit', 'commercial.team.read', 'commercial.work.manage'];

describePrisma('initial commercial provisioning plan (disposable Postgres, synthetic identities, 22:29 decision 2)', () => {
  const prisma = () => getOsPrisma()!;
  let store: PrismaOsWorkforceStore;

  before(() => {
    store = new PrismaOsWorkforceStore(prisma());
  });

  /** A member with no administrative scope: the seeded people.admin row is ended before the test. */
  async function plainMember(orgId: string, label: string) {
    const email = `${label}-${createId().slice(-6)}@synthetic.invalid`;
    const seeded = await store.seedAdminMember(orgId, email, 'Synth', label);
    await prisma().osRoleAssignment.updateMany({
      where: { memberId: seeded.member.id, roleKey: 'people.admin' },
      data: { endedAt: new Date('2020-01-02') },
    });
    return { ...seeded, email };
  }

  async function reportsTo(orgId: string, memberId: string, managerMemberId: string) {
    await prisma().osManagerAssignment.create({
      data: { id: createId(), organizationId: orgId, memberId, managerMemberId, effectiveAt: new Date('2020-01-01') },
    });
  }

  /** Intended setup: two Gerentes (organization range) and one Jefe (team range) with two advisors. */
  async function roster() {
    const slug = `boot-${createId().slice(-8)}`;
    const org = await store.seedOrganization('Bootstrap Synth S.R.L.', slug);
    const gerenteA = await plainMember(org.id, 'gerencia-a');
    const gerenteB = await plainMember(org.id, 'gerencia-b');
    const jefe = await plainMember(org.id, 'jefe');
    const asesor1 = await plainMember(org.id, 'asesor-1');
    const asesor2 = await plainMember(org.id, 'asesor-2');
    await reportsTo(org.id, jefe.member.id, gerenteA.member.id);
    await reportsTo(org.id, asesor1.member.id, jefe.member.id);
    await reportsTo(org.id, asesor2.member.id, jefe.member.id);
    const gerencia = (m: typeof gerenteA): BootstrapHolderRequest => ({
      memberId: m.member.id,
      memberEmail: m.email.toUpperCase(),
      proposal: 'commercial_manager',
      range: 'organization',
      scopes: MANAGER_SCOPES,
    });
    const holders: BootstrapHolderRequest[] = [
      gerencia(gerenteA),
      gerencia(gerenteB),
      {
        memberId: jefe.member.id,
        memberEmail: jefe.email,
        proposal: 'team_manager',
        range: 'team',
        scopes: TEAM_SCOPES,
        directReportIds: [asesor2.member.id, asesor1.member.id],
      },
    ];
    const request: BootstrapRequest = {
      organizationId: org.id,
      organizationSlug: slug,
      holders,
      approvalReference: 'SYNTHETIC-APPROVAL-1',
      operator: 'synthetic-operator',
      reason: 'synthetic test of the initial provisioning plan',
    };
    return { org, slug, gerenteA, gerenteB, jefe, asesor1, asesor2, request };
  }

  const refusedWith = (reason: string) => (error: unknown) =>
    error instanceof BootstrapRefused && error.reason === reason;

  const roleRows = (organizationId: string) => prisma().osRoleAssignment.count({ where: { organizationId } });
  const bootstrapRows = (organizationId: string) =>
    prisma().osRoleAssignment.findMany({ where: { organizationId, id: { startsWith: 'bootstrap:' } } });
  const auditRows = (organizationId: string) =>
    prisma().osAuditLog.count({ where: { organizationId, action: 'organization.bootstrap_plan.applied' } });
  const effectiveScopes = async (organizationId: string, memberId: string) =>
    computeEffectiveScopes(await prisma().osRoleAssignment.findMany({ where: { organizationId, memberId } }), [], new Date()).sort();

  it('Jefe/Gerencia roster: one plan completes every holder without people.admin, independent of listing order', async () => {
    const r = await roster();
    const before = await roleRows(r.org.id);
    const plan = await planInitialCommercialBootstrap(prisma(), r.request);
    assert.equal(await roleRows(r.org.id), before, 'dry run writes nothing');
    assert.equal(plan.alreadyApplied, false);
    assert.deepEqual(plan.establishedScopes, ['commercial.customer.edit', 'commercial.org.read', 'commercial.team.read', 'commercial.work.manage']);
    for (const scope of plan.establishedScopes) {
      const grants = plan.holders.flatMap((h) => h.grants.filter((g) => g.scope === scope));
      assert.equal(grants.filter((g) => g.kind === 'establish').length, 1, scope);
    }
    assert.equal(plan.holders.flatMap((h) => h.grants).filter((g) => g.scope === 'commercial.customer.edit').length, 3);
    for (const holder of plan.holders) assert.deepEqual(holder.currentScopes, [], 'nobody starts with an administrative scope');

    const reversed = { ...r.request, holders: [...r.request.holders].reverse() };
    const reversedPlan = await planInitialCommercialBootstrap(prisma(), reversed);
    assert.equal(reversedPlan.planHash, plan.planHash);
    assert.deepEqual(reversedPlan.holders, plan.holders);

    const result = await executeInitialCommercialBootstrap(prisma(), reversed, plan.planHash);
    assert.equal(result.alreadyApplied, false);
    assert.deepEqual(await effectiveScopes(r.org.id, r.gerenteA.member.id), MANAGER_SCOPES);
    assert.deepEqual(await effectiveScopes(r.org.id, r.gerenteB.member.id), MANAGER_SCOPES);
    assert.deepEqual(await effectiveScopes(r.org.id, r.jefe.member.id), TEAM_SCOPES);
    assert.deepEqual(await effectiveScopes(r.org.id, r.asesor1.member.id), [], 'no default recipients');
    for (const m of [r.gerenteA, r.gerenteB, r.jefe]) {
      assert.equal((await effectiveScopes(r.org.id, m.member.id)).includes('people.admin'), false);
    }
    const event = await prisma().osBusinessEvent.findFirstOrThrow({ where: { id: result.eventId! } });
    assert.equal(event.eventType, 'organization.bootstrap_plan.applied');
    assert.equal(event.actorMemberId, null);
    assert.equal(event.provenance, 'bootstrap');
    const payload = event.payloadJson as { approvalReference: string; planHash: string; holders: unknown[] };
    assert.equal(payload.approvalReference, 'SYNTHETIC-APPROVAL-1');
    assert.equal(payload.planHash, plan.planHash);
    assert.equal(payload.holders.length, 3);
    assert.equal(await prisma().osOutboxMessage.count({ where: { eventId: event.id } }), 1);
    assert.equal(await auditRows(r.org.id), 1);

    const rowsAfter = await roleRows(r.org.id);
    const again = await executeInitialCommercialBootstrap(prisma(), r.request, plan.planHash);
    assert.deepEqual(again, { applied: [], alreadyApplied: true, eventId: null });
    assert.equal(await roleRows(r.org.id), rowsAfter);
    assert.equal(await auditRows(r.org.id), 1);
  });

  it('after the plan, further grants go through governed commands: other plans and outside holders are refused', async () => {
    const r = await roster();
    await executeInitialCommercialBootstrap(prisma(), r.request, (await planInitialCommercialBootstrap(prisma(), r.request)).planHash);
    const extra = await plainMember(r.org.id, 'extra');
    const third: BootstrapHolderRequest = {
      memberId: extra.member.id,
      memberEmail: extra.email,
      proposal: 'commercial_manager',
      range: 'organization',
      scopes: ['commercial.customer.edit'],
    };
    await assert.rejects(
      () => planInitialCommercialBootstrap(prisma(), { ...r.request, holders: [...r.request.holders, third] }),
      refusedWith('SCOPE_HELD_OUTSIDE_PLAN'),
    );
    await assert.rejects(
      () => planInitialCommercialBootstrap(prisma(), { ...r.request, holders: [third] }),
      refusedWith('SCOPE_HELD_OUTSIDE_PLAN'),
    );
    await assert.rejects(
      () => planInitialCommercialBootstrap(prisma(), { ...r.request, holders: r.request.holders.slice(0, 2) }),
      refusedWith('SCOPE_HELD_OUTSIDE_PLAN'),
      'a reduced copy of the applied plan is a different plan',
    );

    const fresh = await roster();
    await prisma().osRoleAssignment.create({
      data: { id: createId(), organizationId: fresh.org.id, memberId: fresh.asesor1.member.id, roleKey: 'commercial.work.manage', effectiveAt: new Date('2020-01-01') },
    });
    await assert.rejects(() => planInitialCommercialBootstrap(prisma(), fresh.request), refusedWith('SCOPE_HELD_OUTSIDE_PLAN'));
    assert.equal((await bootstrapRows(fresh.org.id)).length, 0);
  });

  it('validates the complete plan before writing: prerequisites, identities, standing, bounds and tenant', async () => {
    const a = await roster();
    const b = await roster();
    const [gA, gB, jefe] = a.request.holders as [BootstrapHolderRequest, BootstrapHolderRequest, BootstrapHolderRequest];
    const withHolder = (holder: BootstrapHolderRequest): BootstrapRequest => ({ ...a.request, holders: [gA, gB, holder] });
    const cases: Array<[string, BootstrapRequest]> = [
      ['PREREQUISITE_NOT_MET', withHolder({ ...jefe, directReportIds: undefined })],
      ['PREREQUISITE_NOT_MET', withHolder({ ...jefe, directReportIds: [a.asesor1.member.id] })],
      ['PREREQUISITE_NOT_MET', withHolder({ ...jefe, directReportIds: [a.asesor1.member.id, a.asesor2.member.id, gB.memberId] })],
      ['PREREQUISITE_NOT_MET', { ...a.request, holders: [{ ...gA, directReportIds: [a.asesor1.member.id] }] }],
      ['WRONG_TENANT', { ...a.request, organizationSlug: b.slug }],
      ['MEMBER_NOT_FOUND', withHolder({ ...jefe, memberId: b.jefe.member.id })],
      ['IDENTITY_MISMATCH', withHolder({ ...jefe, memberEmail: b.jefe.email })],
      ['SCOPE_NOT_ALLOWED', withHolder({ ...jefe, scopes: ['people.admin'] })],
      ['SCOPE_NOT_ALLOWED', withHolder({ ...jefe, scopes: ['commercial.org.read'] })],
      ['SCOPE_NOT_ALLOWED', withHolder({ ...jefe, scopes: [...ADDITIONAL_ASSIGNABLE_SCOPE_KEYS] })],
      ['SCOPE_NOT_ALLOWED', withHolder({ ...gA, memberId: jefe.memberId, memberEmail: jefe.memberEmail, scopes: ['commercial.assignment.org'] })],
      ['RANGE_MISMATCH', withHolder({ ...jefe, range: 'organization' })],
      ['INVALID_INPUT', { ...a.request, holders: [] }],
      ['INVALID_INPUT', { ...a.request, holders: undefined as unknown as BootstrapHolderRequest[] }],
      ['INVALID_INPUT', { ...a.request, holders: [gA, gA] }],
      ['INVALID_INPUT', { ...a.request, holders: [gA, { ...gA, proposal: 'team_manager', range: 'team', scopes: ['commercial.team.read'], directReportIds: [a.jefe.member.id] }] }],
      ['INVALID_INPUT', { ...a.request, approvalReference: ' ' }],
      ['INVALID_INPUT', withHolder({ ...jefe, scopes: [] })],
      ['INVALID_INPUT', withHolder({ ...jefe, proposal: 'all' })],
      ['INVALID_INPUT', withHolder({ ...jefe, scopes: undefined as unknown as string[] })],
    ];
    for (const [reason, request] of cases) {
      await assert.rejects(() => planInitialCommercialBootstrap(prisma(), request), refusedWith(reason), reason);
    }

    const twinEmail = `twin-${createId().slice(-6)}@synthetic.invalid`;
    const twin1 = await plainMember(a.org.id, 'twin-uno');
    const twin2 = await plainMember(a.org.id, 'twin-dos');
    await prisma().osAuthIdentity.update({ where: { id: twin1.auth.id }, data: { email: twinEmail } });
    await prisma().osAuthIdentity.update({ where: { id: twin2.auth.id }, data: { email: twinEmail, provider: 'synthetic-alt' } });
    await assert.rejects(
      () => planInitialCommercialBootstrap(prisma(), { ...a.request, holders: [gA, { ...gB, memberId: twin1.member.id, memberEmail: twinEmail }] }),
      refusedWith('IDENTITY_AMBIGUOUS'),
    );

    const plan = await planInitialCommercialBootstrap(prisma(), a.request);
    await prisma().osOrganizationMember.update({ where: { id: a.gerenteB.member.id }, data: { accessStatus: 'suspended' } });
    await assert.rejects(() => executeInitialCommercialBootstrap(prisma(), a.request, plan.planHash), refusedWith('MEMBER_NOT_ACTIVE'));
    assert.equal((await bootstrapRows(a.org.id)).length, 0, 'one inactive holder refuses the whole plan');
    assert.equal(await auditRows(a.org.id), 0);
  });

  it('execution is bound to the exact reviewed hash', async () => {
    const r = await roster();
    const plan = await planInitialCommercialBootstrap(prisma(), r.request);
    const variants: BootstrapRequest[] = [
      { ...r.request, holders: r.request.holders.slice(0, 2) },
      { ...r.request, approvalReference: 'SYNTHETIC-APPROVAL-2' },
      { ...r.request, holders: [{ ...r.request.holders[0]!, scopes: MANAGER_SCOPES.slice(0, 2) }, ...r.request.holders.slice(1)] },
    ];
    for (const variant of variants) {
      await assert.rejects(() => executeInitialCommercialBootstrap(prisma(), variant, plan.planHash), refusedWith('PLAN_HASH_MISMATCH'));
    }
    assert.equal((await bootstrapRows(r.org.id)).length, 0);
  });

  it('concurrent runs: the same plan applies once; two different plans cannot both establish a scope', async () => {
    const r = await roster();
    const plan = await planInitialCommercialBootstrap(prisma(), r.request);
    const same = await Promise.allSettled([
      executeInitialCommercialBootstrap(prisma(), r.request, plan.planHash),
      executeInitialCommercialBootstrap(prisma(), r.request, plan.planHash),
    ]);
    assert.ok(same.some((s) => s.status === 'fulfilled'));
    assert.equal((await bootstrapRows(r.org.id)).length, 9);
    assert.equal(await auditRows(r.org.id), 1);

    const o = await roster();
    const planA: BootstrapRequest = { ...o.request, holders: [o.request.holders[0]!] };
    const planB: BootstrapRequest = { ...o.request, holders: [o.request.holders[1]!] };
    const [hashA, hashB] = [
      (await planInitialCommercialBootstrap(prisma(), planA)).planHash,
      (await planInitialCommercialBootstrap(prisma(), planB)).planHash,
    ];
    const racing = await Promise.allSettled([
      executeInitialCommercialBootstrap(prisma(), planA, hashA),
      executeInitialCommercialBootstrap(prisma(), planB, hashB),
    ]);
    assert.equal(racing.filter((s) => s.status === 'fulfilled').length, 1);
    const rows = await bootstrapRows(o.org.id);
    assert.equal(new Set(rows.map((row) => row.memberId)).size, 1, 'only one plan wrote rows');
    assert.equal(rows.length, MANAGER_SCOPES.length);
    assert.equal(await auditRows(o.org.id), 1);
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
