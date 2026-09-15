import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { getOsPrisma, PrismaOsPartyStore, PrismaOsWorkforceStore } from './index';
import { PartyCommandService } from '@isalwa/os-party';
import type { RequestContext } from '@isalwa/os-contracts';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('partygraph prisma integration', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let workforceStore: PrismaOsWorkforceStore;
  let partyStore: PrismaOsPartyStore;
  let svc: PartyCommandService;

  before(async () => {
    prisma = getOsPrisma()!;
    workforceStore = new PrismaOsWorkforceStore(prisma);
    partyStore = new PrismaOsPartyStore(prisma);
    svc = new PartyCommandService(partyStore);
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
      correlationId: `corr-${Date.now()}-${Math.random()}`,
      effectiveAt: new Date(),
    };
  }

  it('creates party with event audit outbox atomically', async () => {
    const org = await workforceStore.seedOrganization('Party Org', `party-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const result = await svc.execute(
      'CreateParty',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        partyKind: 'organization',
        displayName: 'Distribuidora ABC',
        legalName: 'Distribuidora ABC SRL',
        fiscalIdentity: { nit: '123456789', razonSocial: 'Distribuidora ABC SRL' },
        initialRoleKey: 'customer',
        createCommercialAccount: true,
      },
      `idem-create-${Date.now()}`,
    );
    const partyId = String(result.data.partyId);
    assert.ok(partyId);

    const events = await prisma.osBusinessEvent.count({ where: { organizationId: org.id } });
    const audits = await prisma.osAuditLog.count({ where: { organizationId: org.id } });
    const outbox = await prisma.osOutboxMessage.count({ where: { organizationId: org.id } });
    assert.ok(events >= 1);
    assert.ok(audits >= 1);
    assert.ok(outbox >= 1);

    const event = await prisma.osBusinessEvent.findFirst({
      where: { organizationId: org.id, eventType: 'party.created' },
    });
    assert.ok(event?.idempotencyKey);
    assert.equal(event?.correlationId, result.correlationId);

    const commercial = await partyStore.getCommercialAccountForParty(org.id, partyId);
    assert.ok(commercial);
  });

  it('assigns multiple roles to same party', async () => {
    const org = await workforceStore.seedOrganization('Multi Role', `multi-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md2-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const created = await svc.execute('CreateParty', c, {
      partyKind: 'organization',
      displayName: 'Dual Role Co',
    });
    const partyId = String(created.data.partyId);

    await svc.execute('AssignPartyRole', c, { partyId, roleKey: 'customer' });
    await svc.execute('AssignPartyRole', c, { partyId, roleKey: 'supplier' });

    const roles = await partyStore.listActivePartyRoles(org.id, partyId, new Date());
    assert.equal(roles.length, 2);
    assert.ok(roles.some((r) => r.roleKey === 'customer'));
    assert.ok(roles.some((r) => r.roleKey === 'supplier'));
  });

  it('ends role without deleting party', async () => {
    const org = await workforceStore.seedOrganization('End Role', `end-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md3-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const created = await svc.execute('CreateParty', c, {
      partyKind: 'organization',
      displayName: 'Role End Co',
      initialRoleKey: 'vendor',
    });
    const partyId = String(created.data.partyId);
    const rolesBefore = await partyStore.listActivePartyRoles(org.id, partyId, new Date());
    await svc.execute('EndPartyRole', c, { roleAssignmentId: rolesBefore[0]!.id });
    const active = await partyStore.listActivePartyRoles(org.id, partyId, new Date());
    assert.equal(active.length, 0);
    const party = await partyStore.getPartyInOrg(org.id, partyId);
    assert.equal(party?.status, 'active');
  });

  it('updates contact on organization party', async () => {
    const org = await workforceStore.seedOrganization('Contact Org', `contact-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md4-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const created = await svc.execute('CreateParty', c, {
      partyKind: 'organization',
      displayName: 'Contact Org Party',
    });
    const partyId = String(created.data.partyId);
    await svc.execute('UpdateContact', c, {
      organizationPartyId: partyId,
      givenName: 'Juan',
      familyName: 'Perez',
      email: 'juan@example.bo',
      whatsapp: '+59170000000',
    });
    const contacts = await partyStore.listContactsForOrgParty(org.id, partyId);
    assert.equal(contacts.length, 1);
    assert.equal(contacts[0]?.email, 'juan@example.bo');
  });

  it('deactivates and reactivates party', async () => {
    const org = await workforceStore.seedOrganization('Deact Org', `deact-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md5-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const created = await svc.execute('CreateParty', c, {
      partyKind: 'organization',
      displayName: 'Inactive Co',
    });
    const partyId = String(created.data.partyId);
    await svc.execute('DeactivateParty', c, { partyId });
    let party = await partyStore.getPartyInOrg(org.id, partyId);
    assert.equal(party?.status, 'inactive');
    await svc.execute('ReactivateParty', c, { partyId });
    party = await partyStore.getPartyInOrg(org.id, partyId);
    assert.equal(party?.status, 'active');
  });

  it('suggests duplicate candidate on matching NIT without silent merge', async () => {
    const org = await workforceStore.seedOrganization('Dup Org', `dup-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md6-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const first = await svc.execute('CreateParty', c, {
      partyKind: 'organization',
      displayName: 'NIT One',
      fiscalIdentity: { nit: '999888777', razonSocial: 'NIT One SRL' },
    });
    await svc.execute('CreateParty', c, {
      partyKind: 'organization',
      displayName: 'NIT Two',
      fiscalIdentity: { nit: '999888777', razonSocial: 'NIT Two SRL' },
    });
    const partyId = String(first.data.partyId);
    const candidates = await partyStore.listDuplicateCandidates(org.id, partyId);
    assert.ok(candidates.length >= 1);
    const parties = await prisma.osParty.count({ where: { organizationId: org.id, status: 'active' } });
    assert.equal(parties, 2);
  });

  it('governed merge preserves lineage and references', async () => {
    const org = await workforceStore.seedOrganization('Merge Org', `merge-${Date.now()}`);
    const mdAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md7-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const orgAdmin = await workforceStore.seedScopedAdminMember(
      org.id,
      `org-${Date.now()}@o.bo`,
      'Org',
      'Admin',
      'org.admin',
    );
    const cMd = ctx(org.id, mdAdmin.member.id, mdAdmin.person.id, mdAdmin.auth.id);
    const cOrg = ctx(org.id, orgAdmin.member.id, orgAdmin.person.id, orgAdmin.auth.id);

    const source = await svc.execute('CreateParty', cMd, {
      partyKind: 'organization',
      displayName: 'Source Co',
      initialRoleKey: 'supplier',
    });
    const target = await svc.execute('CreateParty', cMd, {
      partyKind: 'organization',
      displayName: 'Target Co',
      initialRoleKey: 'customer',
      createCommercialAccount: true,
    });
    const sourceId = String(source.data.partyId);
    const targetId = String(target.data.partyId);

    await svc.execute('UpdateContact', cMd, {
      organizationPartyId: sourceId,
      givenName: 'Ana',
      familyName: 'Contact',
      email: 'ana@source.bo',
    });

    const requested = await svc.execute('RequestPartyMerge', cMd, {
      sourcePartyId: sourceId,
      targetPartyId: targetId,
    });
    const mergeRequestId = String(requested.data.mergeRequestId);
    await svc.execute('ApprovePartyMerge', cOrg, { mergeRequestId });

    const mergedSource = await partyStore.getPartyInOrg(org.id, sourceId);
    assert.equal(mergedSource?.status, 'merged');
    assert.equal(mergedSource?.mergedIntoPartyId, targetId);

    const contacts = await partyStore.listContactsForOrgParty(org.id, targetId);
    assert.equal(contacts.length, 1);

    const mergeRow = await partyStore.getMergeRequest(org.id, mergeRequestId);
    assert.equal(mergeRow?.status, 'approved');
    assert.ok(mergeRow?.lineageSnapshotJson);

    const targetRoles = await partyStore.listActivePartyRoles(org.id, targetId, new Date());
    assert.ok(targetRoles.some((r) => r.roleKey === 'customer'));
    assert.ok(targetRoles.some((r) => r.roleKey === 'supplier'));
  });

  it('idempotent command retry does not duplicate party', async () => {
    const org = await workforceStore.seedOrganization('Idem Org', `idem-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md8-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    const key = `idem-party-${Date.now()}`;
    const first = await svc.execute(
      'CreateParty',
      c,
      { partyKind: 'organization', displayName: 'Idem Co' },
      key,
    );
    const second = await svc.execute(
      'CreateParty',
      c,
      { partyKind: 'organization', displayName: 'Idem Co' },
      key,
    );
    assert.equal(first.commandId, second.commandId);
    const count = await prisma.osParty.count({ where: { organizationId: org.id } });
    assert.equal(count, 1);
  });

  it('rejects cross-tenant party command', async () => {
    const orgA = await workforceStore.seedOrganization('Tenant PA', `pa-${Date.now()}`);
    const orgB = await workforceStore.seedOrganization('Tenant PB', `pb-${Date.now()}`);
    const adminA = await workforceStore.seedScopedAdminMember(
      orgA.id,
      `mda-${Date.now()}@o.bo`,
      'A',
      'Admin',
      'master_data.admin',
    );
    await assert.rejects(
      () =>
        svc.execute(
          'CreateParty',
          ctx(orgB.id, adminA.member.id, adminA.person.id, adminA.auth.id),
          { partyKind: 'organization', displayName: 'Evil' },
        ),
      (err: Error) => err.message === 'TENANT_FORBIDDEN',
    );
  });
});

describePrisma('partygraph interactive transaction hardening', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let workforceStore: PrismaOsWorkforceStore;
  let partyStore: PrismaOsPartyStore;
  let svc: PartyCommandService;

  before(async () => {
    prisma = getOsPrisma()!;
    workforceStore = new PrismaOsWorkforceStore(prisma);
    partyStore = new PrismaOsPartyStore(prisma);
    svc = new PartyCommandService(partyStore);
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
      correlationId: `corr-tx-${Date.now()}-${Math.random()}`,
      effectiveAt: new Date(),
    };
  }

  async function counts(organizationId: string) {
    const [parties, roles, accounts, events, audits, outbox] = await Promise.all([
      prisma.osParty.count({ where: { organizationId } }),
      prisma.osPartyRoleAssignment.count({ where: { organizationId } }),
      prisma.osCommercialAccount.count({ where: { organizationId } }),
      prisma.osBusinessEvent.count({ where: { organizationId } }),
      prisma.osAuditLog.count({ where: { organizationId } }),
      prisma.osOutboxMessage.count({ where: { organizationId } }),
    ]);
    return { parties, roles, accounts, events, audits, outbox };
  }

  it('CreateParty commits party role commercial event audit outbox atomically', async () => {
    const org = await workforceStore.seedOrganization('Tx Hard Org', `txh-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `txh-md-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const before = await counts(org.id);
    const result = await svc.execute(
      'CreateParty',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        partyKind: 'organization',
        displayName: 'Tx Cliente',
        legalName: 'Tx Cliente S.R.L.',
        fiscalIdentity: { nit: `TX-${Date.now()}`, razonSocial: 'Tx Cliente S.R.L.' },
        initialRoleKey: 'customer',
        createCommercialAccount: true,
      },
    );
    const partyId = String(result.data.partyId);
    const after = await counts(org.id);
    assert.equal(after.parties, before.parties + 1);
    assert.equal(after.roles, before.roles + 1);
    assert.equal(after.accounts, before.accounts + 1);
    assert.ok(after.events >= before.events + 1);
    assert.ok(after.audits >= before.audits + 1);
    assert.ok(after.outbox >= before.outbox + 1);
    assert.ok(await partyStore.getCommercialAccountForParty(org.id, partyId));
    const createdEvent = await prisma.osBusinessEvent.findFirst({
      where: { organizationId: org.id, primaryEntityId: partyId, eventType: 'party.created' },
    });
    assert.ok(createdEvent);
    const audit = await prisma.osAuditLog.findFirst({
      where: { organizationId: org.id, resourceId: partyId },
    });
    assert.ok(audit);
    const outbox = await prisma.osOutboxMessage.findFirst({
      where: { organizationId: org.id, eventId: createdEvent!.id },
    });
    assert.ok(outbox);
  });

  it('rolls back Party/role/account/event/audit/outbox when append fails', async () => {
    const org = await workforceStore.seedOrganization('Tx Fail Org', `txf-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `txf-md-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const before = await counts(org.id);
    partyStore.testFailNextAppend = true;
    await assert.rejects(
      () =>
        svc.execute(
          'CreateParty',
          ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
          {
            partyKind: 'organization',
            displayName: 'Should Roll Back',
            legalName: 'Should Roll Back SRL',
            fiscalIdentity: { nit: `FAIL-${Date.now()}`, razonSocial: 'Should Roll Back SRL' },
            initialRoleKey: 'customer',
            createCommercialAccount: true,
          },
        ),
      (err: Error) => err.message === 'TEST_APPEND_FAIL',
    );
    assert.equal(partyStore.testFailNextAppend, false);
    const after = await counts(org.id);
    assert.deepEqual(after, before);
  });

  it('latency regression: delay above old 5s default still succeeds with new timeout', async () => {
    const org = await workforceStore.seedOrganization('Tx Latency Org', `txl-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `txl-md-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    // Controlled Prisma lifetime: delay exceeds historical 5s default; config keeps 8s budget.
    partyStore.interactiveTxOptions = { maxWait: 2_000, timeout: 8_000 };
    partyStore.testAppendDelayMs = 5_500;
    const before = await counts(org.id);
    const result = await svc.execute(
      'CreateParty',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        partyKind: 'organization',
        displayName: 'Latency Ok',
        legalName: 'Latency Ok SRL',
        initialRoleKey: 'customer',
        createCommercialAccount: true,
      },
    );
    assert.ok(result.data.partyId);
    const after = await counts(org.id);
    assert.equal(after.parties, before.parties + 1);
    assert.ok(after.events >= before.events + 1);
    assert.ok(after.audits >= before.audits + 1);
    assert.ok(after.outbox >= before.outbox + 1);
    partyStore.interactiveTxOptions = undefined;
    partyStore.testAppendDelayMs = 0;
  });

  it('latency regression: delay beyond configured timeout leaves no partial rows', async () => {
    const org = await workforceStore.seedOrganization('Tx Timeout Org', `txt-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `txt-md-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    partyStore.interactiveTxOptions = { maxWait: 2_000, timeout: 1_200 };
    partyStore.testAppendDelayMs = 2_000;
    const before = await counts(org.id);
    await assert.rejects(() =>
      svc.execute(
        'CreateParty',
        ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
        {
          partyKind: 'organization',
          displayName: 'Timeout Partial',
          legalName: 'Timeout Partial SRL',
          initialRoleKey: 'customer',
          createCommercialAccount: true,
        },
      ),
    );
    const after = await counts(org.id);
    assert.deepEqual(after, before);
    partyStore.interactiveTxOptions = undefined;
    partyStore.testAppendDelayMs = 0;
  });

  it('after failed CreateParty, same store instance succeeds without stale tx client', async () => {
    const org = await workforceStore.seedOrganization('Tx Reuse Org', `txr-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `txr-md-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    partyStore.testFailNextAppend = true;
    await assert.rejects(
      () =>
        svc.execute('CreateParty', c, {
          partyKind: 'organization',
          displayName: 'Fail First',
          initialRoleKey: 'customer',
          createCommercialAccount: true,
        }),
      (err: Error) => err.message === 'TEST_APPEND_FAIL',
    );
    const result = await svc.execute('CreateParty', c, {
      partyKind: 'organization',
      displayName: 'Succeed Second',
      legalName: 'Succeed Second SRL',
      initialRoleKey: 'customer',
      createCommercialAccount: true,
    });
    assert.ok(result.data.partyId);
    const party = await partyStore.getPartyInOrg(org.id, String(result.data.partyId));
    assert.ok(party);
    assert.equal(party?.displayName, 'Succeed Second');
  });

  it('CreateParty still requires master_data.admin; Asesor scopes are denied', async () => {
    const org = await workforceStore.seedOrganization('Tx Auth Org', `txa-${Date.now()}`);
    const asesor = await workforceStore.seedScopedAdminMember(
      org.id,
      `txa-asesor-${Date.now()}@o.bo`,
      'Synth',
      'Asesor',
      'commercial.customer.create',
    );
    await workforceStore.insertRoleAssignment({
      id: `txa-q-${Date.now()}`,
      organizationId: org.id,
      memberId: asesor.member.id,
      roleKey: 'commercial.quote.convert.own',
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });
    await assert.rejects(
      () =>
        svc.execute(
          'CreateParty',
          ctx(org.id, asesor.member.id, asesor.person.id, asesor.auth.id),
          {
            partyKind: 'organization',
            displayName: 'Denied Asesor',
            initialRoleKey: 'customer',
            createCommercialAccount: true,
          },
        ),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
    assert.equal(await prisma.osParty.count({ where: { organizationId: org.id } }), 0);
  });
});
