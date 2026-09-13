import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import {
  MemberQueryService,
  CapabilityQueryService,
  encodeMemberDirectoryCursor,
  buildQueryContext,
} from '@isalwa/os-query';
import { getOsPrisma, PrismaMemberQueryStore, PrismaOsWorkforceStore } from './index';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('member + capability query prisma integration', () => {
  let workforceStore: PrismaOsWorkforceStore;
  let memberStore: PrismaMemberQueryStore;
  let memberQuery: MemberQueryService;
  let capabilityQuery: CapabilityQueryService;
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;

  before(async () => {
    prisma = getOsPrisma()!;
    workforceStore = new PrismaOsWorkforceStore(prisma);
    memberStore = new PrismaMemberQueryStore(prisma);
    memberQuery = new MemberQueryService({
      store: memberStore,
      encodeCursor: encodeMemberDirectoryCursor,
    });
    capabilityQuery = new CapabilityQueryService({ store: memberStore });
    await workforceStore.truncateAll();
  });

  function ctx(
    orgId: string,
    memberId: string,
    personId: string,
    authId: string,
  ): RequestContext {
    return {
      organizationId: orgId,
      actorMemberId: memberId,
      personId,
      authIdentityId: authId,
      correlationId: createId(),
      effectiveAt: new Date('2026-08-24T16:00:00Z'),
    };
  }

  it('ListMembers returns org directory for people.admin', async () => {
    const org = await workforceStore.seedOrganization('Members Org', `mem-${createId()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `admin-${createId()}@mem.bo`,
      'Admin',
      'User',
      'people.admin',
    );
    await workforceStore.seedAdminMember(org.id, `rep-${createId()}@mem.bo`, 'Sales', 'Rep');

    const qctx = await buildQueryContext(
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      workforceStore,
    );
    const page = await memberQuery.listMembers(qctx, { limit: 25 });
    assert.ok(page.items.length >= 2);
    assert.ok(page.items.every((m) => m.organizationId === org.id));
    assert.ok(page.items.some((m) => m.roleKeys.includes('people.admin')));
    assert.ok(page.items.every((m) => m.displayName.length > 0));
  });

  it('ListMembers denies non-admin members', async () => {
    const org = await workforceStore.seedOrganization('Deny Org', `deny-${createId()}`);
    const personId = createId();
    const memberId = createId();
    const authId = createId();
    await prisma.osPerson.create({ data: { id: personId, givenName: 'Sales', familyName: 'Only' } });
    await prisma.osOrganizationMember.create({
      data: {
        id: memberId,
        organizationId: org.id,
        personId,
        employmentStatus: 'active',
        accessStatus: 'active',
        employmentStartedAt: new Date(),
        version: 0,
      },
    });
    await prisma.osAuthIdentity.create({
      data: {
        id: authId,
        personId,
        provider: 'local-dev',
        providerSubject: `subject:${createId()}@deny.bo`,
        email: `rep-${createId()}@deny.bo`,
        status: 'active',
        activatedAt: new Date(),
      },
    });
    await prisma.osRoleAssignment.create({
      data: {
        id: createId(),
        organizationId: org.id,
        memberId,
        roleKey: 'sales_rep',
        effectiveAt: new Date('2020-01-01'),
      },
    });

    const qctx = await buildQueryContext(
      ctx(org.id, memberId, personId, authId),
      workforceStore,
    );
    await assert.rejects(
      () => memberQuery.listMembers(qctx, { limit: 25 }),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
  });

  it('GetMember summary is tenant scoped', async () => {
    const orgA = await workforceStore.seedOrganization('Mem A', `ma-${createId()}`);
    const orgB = await workforceStore.seedOrganization('Mem B', `mb-${createId()}`);
    const adminA = await workforceStore.seedScopedAdminMember(
      orgA.id,
      `a-${createId()}@ma.bo`,
      'A',
      'Admin',
      'people.admin',
    );
    const memberB = await workforceStore.seedAdminMember(
      orgB.id,
      `b-${createId()}@mb.bo`,
      'B',
      'User',
    );

    const qctxA = await buildQueryContext(
      ctx(orgA.id, adminA.member.id, adminA.person.id, adminA.auth.id),
      workforceStore,
    );
    await assert.rejects(
      () => memberQuery.getMember(qctxA, memberB.member.id),
      (err: Error) => err.message === 'NOT_FOUND',
    );
  });

  it('GetCapabilityState reports ACTIVE implemented lanes and LOCKED finance', async () => {
    const org = await workforceStore.seedOrganization('Cap Org', `cap-${createId()}`);
    const admin = await workforceStore.seedAdminMember(
      org.id,
      `cap-${createId()}@cap.bo`,
      'Cap',
      'Admin',
    );
    const qctx = await buildQueryContext(
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      workforceStore,
    );
    const { capabilities } = await capabilityQuery.getCapabilityState(qctx);
    const byKey = new Map(capabilities.map((c) => [c.capabilityKey, c]));

    assert.equal(byKey.get('workforce')?.state, 'ACTIVE');
    assert.equal(byKey.get('partygraph')?.state, 'ACTIVE');
    assert.equal(byKey.get('work')?.state, 'ACTIVE');
    assert.equal(byKey.get('commercial')?.state, 'ACTIVE');
    assert.equal(byKey.get('finance')?.state, 'LOCKED');
    assert.equal(byKey.get('messaging')?.state, 'NOT_CONFIGURED');
    assert.equal(byKey.get('finance')?.implemented, false);
    assert.equal(byKey.get('commercial')?.implemented, true);
  });

  it('org capability override is respected', async () => {
    const org = await workforceStore.seedOrganization('Override Org', `ov-${createId()}`);
    const admin = await workforceStore.seedAdminMember(
      org.id,
      `ov-${createId()}@ov.bo`,
      'Ov',
      'Admin',
    );
    await prisma.osCapabilityState.create({
      data: {
        organizationId: org.id,
        capabilityKey: 'finance',
        state: 'APPROVED',
      },
    });

    const qctx = await buildQueryContext(
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      workforceStore,
    );
    const { capabilities } = await capabilityQuery.getCapabilityState(qctx);
    const finance = capabilities.find((c) => c.capabilityKey === 'finance');
    assert.equal(finance?.state, 'APPROVED');
    assert.equal(finance?.source, 'org_override');
  });

  it('canonical terminated member is denied query context', async () => {
    const org = await workforceStore.seedOrganization('Term Org', `term-${createId()}`);
    const rep = await workforceStore.seedAdminMember(
      org.id,
      `term-${createId()}@term.bo`,
      'Term',
      'User',
    );
    // Canonical TerminateMember pair — not accessStatus: 'terminated' (invalid enum).
    await prisma.osOrganizationMember.update({
      where: { id: rep.member.id },
      data: { accessStatus: 'revoked', employmentStatus: 'terminated' },
    });
    await prisma.osAuthIdentity.update({
      where: { id: rep.auth.id },
      data: { status: 'revoked' },
    });

    await assert.rejects(
      () =>
        buildQueryContext(
          ctx(org.id, rep.member.id, rep.person.id, rep.auth.id),
          workforceStore,
        ),
      (err: Error) => err.message === 'ACCESS_REVOKED',
    );
  });

  it('DEFENSE-IN-DEPTH — invalid canonical state employment terminated + access active', async () => {
    const org = await workforceStore.seedOrganization('Corrupt Org', `corrupt-${createId()}`);
    const rep = await workforceStore.seedAdminMember(
      org.id,
      `corrupt-${createId()}@corrupt.bo`,
      'Corrupt',
      'State',
    );
    // Synthetic corruption only — not reachable via TerminateMember.
    await prisma.osOrganizationMember.update({
      where: { id: rep.member.id },
      data: { accessStatus: 'active', employmentStatus: 'terminated' },
    });

    const qctx = await buildQueryContext(
      ctx(org.id, rep.member.id, rep.person.id, rep.auth.id),
      workforceStore,
    );
    assert.equal(qctx.auth.accessStatus, 'active');
    assert.equal(qctx.auth.memberId, rep.member.id);
    // J-13 observation: query layer does not re-check employmentStatus; HTTP os-session still requires active access + auth.
  });

  it('suspended member is denied query context', async () => {
    const org = await workforceStore.seedOrganization('Susp Org', `susp-${createId()}`);
    const rep = await workforceStore.seedAdminMember(
      org.id,
      `susp-${createId()}@susp.bo`,
      'Susp',
      'User',
    );
    await prisma.osOrganizationMember.update({
      where: { id: rep.member.id },
      data: { accessStatus: 'suspended' },
    });

    await assert.rejects(
      () =>
        buildQueryContext(
          ctx(org.id, rep.member.id, rep.person.id, rep.auth.id),
          workforceStore,
        ),
      (err: Error) => err.message === 'ACCESS_REVOKED',
    );
  });
});
