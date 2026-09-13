import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  getOsPrisma,
  PrismaOsOutboxStore,
  PrismaOsPartyStore,
  PrismaOsProjectionStore,
  PrismaOsWorkforceStore,
} from './index';
import { OsOutboxWorker } from '@isalwa/os-events';
import { PartyCommandService } from '@isalwa/os-party';
import {
  PartyProjectionConsumer,
  PartyQueryService,
  buildQueryContext,
  replayPartyProjectionForOrg,
} from '@isalwa/os-query';
import { encodePartySearchCursor } from './prisma-projection-store';
import type { RequestContext } from '@isalwa/os-contracts';
import { OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('projection prisma integration (Step 15)', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let workforceStore: PrismaOsWorkforceStore;
  let partyStore: PrismaOsPartyStore;
  let projectionStore: PrismaOsProjectionStore;
  let outboxStore: PrismaOsOutboxStore;
  let partySvc: PartyCommandService;
  let partyConsumer: PartyProjectionConsumer;
  let partyQuery: PartyQueryService;

  before(async () => {
    prisma = getOsPrisma()!;
    workforceStore = new PrismaOsWorkforceStore(prisma);
    partyStore = new PrismaOsPartyStore(prisma);
    projectionStore = new PrismaOsProjectionStore(prisma);
    outboxStore = new PrismaOsOutboxStore(prisma);
    partySvc = new PartyCommandService(partyStore);
    partyConsumer = new PartyProjectionConsumer({ projectionStore, partyStore });
    partyQuery = new PartyQueryService({
      projectionStore,
      encodeCursor: encodePartySearchCursor,
    });
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

  async function runProjections() {
    const worker = new OsOutboxWorker(outboxStore, [partyConsumer]);
    await worker.runOnce();
  }

  it('party event projects into read model', async () => {
    const org = await workforceStore.seedOrganization('Proj Org', `proj-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    const result = await partySvc.execute(
      'CreateParty',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        partyKind: 'organization',
        displayName: 'Distribuidora Proyección',
        legalName: 'Distribuidora Proyección SRL',
        fiscalIdentity: { nit: '987654321', razonSocial: 'Distribuidora Proyección SRL' },
        initialRoleKey: 'customer',
        createCommercialAccount: true,
      },
      `idem-proj-${Date.now()}`,
    );
    const partyId = String(result.data.partyId);
    await runProjections();

    const readModel = await projectionStore.getPartyReadModel(org.id, partyId);
    assert.ok(readModel);
    assert.equal(readModel.displayName, 'Distribuidora Proyección');
    assert.ok(readModel.hasCommercialAccount);
    assert.deepEqual(readModel.activeRoleKeys, ['customer']);
    assert.ok(readModel.searchText.includes('987654321'));
  });

  it('duplicate event delivery does not duplicate projection rows', async () => {
    const org = await workforceStore.seedOrganization('Dedup Proj', `dedup-p-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md2-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    await partySvc.execute(
      'CreateParty',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        partyKind: 'person',
        displayName: 'Ana Dedup',
        initialRoleKey: 'customer',
      },
      `idem-dedup-${Date.now()}`,
    );
    const worker = new OsOutboxWorker(outboxStore, [partyConsumer]);
    await worker.runOnce();
    await worker.runOnce();
    const count = await prisma.osPartyReadModel.count({ where: { organizationId: org.id } });
    assert.equal(count, 1);
  });

  it('checkpoint survives restart and projection rebuild replays events', async () => {
    const org = await workforceStore.seedOrganization('Rebuild Org', `rebuild-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md3-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    await partySvc.execute(
      'CreateParty',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        partyKind: 'organization',
        displayName: 'Rebuild Co',
        initialRoleKey: 'supplier',
      },
      `idem-rebuild-${Date.now()}`,
    );
    await runProjections();

    const before = await projectionStore.getCheckpoint(
      org.id,
      OS_PROJECTION_CONSUMER_KEYS.partySearch,
    );
    assert.ok(before?.lastEventId);

    const replay = await replayPartyProjectionForOrg(
      { projectionStore, partyStore },
      org.id,
      partyConsumer,
    );
    assert.ok(replay.replayed >= 1);

    const after = await projectionStore.getCheckpoint(
      org.id,
      OS_PROJECTION_CONSUMER_KEYS.partySearch,
    );
    assert.ok(after?.lastEventId);
    assert.equal(await prisma.osPartyReadModel.count({ where: { organizationId: org.id } }), 1);
  });

  it('tenant isolation on search and pagination', async () => {
    const orgA = await workforceStore.seedOrganization('Tenant A', `ta-${Date.now()}`);
    const orgB = await workforceStore.seedOrganization('Tenant B', `tb-${Date.now()}`);
    const adminA = await workforceStore.seedScopedAdminMember(
      orgA.id,
      `a-${Date.now()}@o.bo`,
      'A',
      'Admin',
      'master_data.admin',
    );
    const adminB = await workforceStore.seedScopedAdminMember(
      orgB.id,
      `b-${Date.now()}@o.bo`,
      'B',
      'Admin',
      'master_data.admin',
    );

    await partySvc.execute(
      'CreateParty',
      ctx(orgA.id, adminA.member.id, adminA.person.id, adminA.auth.id),
      { partyKind: 'organization', displayName: 'Alpha Only', initialRoleKey: 'customer' },
      `idem-a-${Date.now()}`,
    );
    await partySvc.execute(
      'CreateParty',
      ctx(orgB.id, adminB.member.id, adminB.person.id, adminB.auth.id),
      { partyKind: 'organization', displayName: 'Beta Only', initialRoleKey: 'customer' },
      `idem-b-${Date.now()}`,
    );
    await runProjections();

    const qctx = await buildQueryContext(
      ctx(orgA.id, adminA.member.id, adminA.person.id, adminA.auth.id),
      workforceStore,
    );
    const page1 = await partyQuery.searchParties(qctx, { limit: 1 });
    assert.equal(page1.items.length, 1);
    assert.equal(page1.items[0]?.displayName, 'Alpha Only');
    assert.ok(page1.meta.hasMore === false || page1.meta.nextCursor);

    const cross = await projectionStore.searchParties(orgB.id, { q: 'Alpha', limit: 10 });
    assert.equal(cross.items.length, 0);
  });

  it('stale freshness when outbox pending and authorized query has no writes', async () => {
    const org = await workforceStore.seedOrganization('Stale Org', `stale-${Date.now()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `md4-${Date.now()}@o.bo`,
      'MD',
      'Admin',
      'master_data.admin',
    );
    await partySvc.execute(
      'CreateParty',
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      {
        partyKind: 'organization',
        displayName: 'Stale Pending',
        initialRoleKey: 'customer',
      },
      `idem-stale-${Date.now()}`,
    );

    const pending = await projectionStore.countPendingOutbox(org.id);
    assert.ok(pending >= 1);

    const beforeRun = await projectionStore.getFreshness(
      org.id,
      OS_PROJECTION_CONSUMER_KEYS.partySearch,
    );
    assert.ok(!beforeRun || beforeRun.isStale !== false);

    await runProjections();
    const freshness = await projectionStore.getFreshness(
      org.id,
      OS_PROJECTION_CONSUMER_KEYS.partySearch,
    );
    assert.ok(freshness);
    assert.equal(freshness.isStale, false);

    const readBefore = await prisma.osPartyReadModel.count({ where: { organizationId: org.id } });
    const qctx = await buildQueryContext(
      ctx(org.id, admin.member.id, admin.person.id, admin.auth.id),
      workforceStore,
    );
    await partyQuery.searchParties(qctx, { q: 'Stale', limit: 10 });
    const readAfter = await prisma.osPartyReadModel.count({ where: { organizationId: org.id } });
    assert.equal(readBefore, readAfter);
  });
});
