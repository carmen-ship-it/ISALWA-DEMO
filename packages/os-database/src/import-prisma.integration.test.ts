import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  getOsPrisma,
  PrismaOsPartyStore,
  PrismaOsWorkforceStore,
  PrismaOsImportStore,
} from './index';
import { LocationCommandService, PartyCommandService } from '@isalwa/os-party';
import { ImportCommandService } from '@isalwa/os-import';
import type { RequestContext } from '@isalwa/os-contracts';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('client import prisma integration', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let workforceStore: PrismaOsWorkforceStore;
  let partyStore: PrismaOsPartyStore;
  let importStore: PrismaOsImportStore;
  let partySvc: PartyCommandService;
  let locationSvc: LocationCommandService;
  let importSvc: ImportCommandService;

  before(async () => {
    prisma = getOsPrisma()!;
    workforceStore = new PrismaOsWorkforceStore(prisma);
    partyStore = new PrismaOsPartyStore(prisma);
    importStore = new PrismaOsImportStore(prisma);
    partySvc = new PartyCommandService(partyStore);
    locationSvc = new LocationCommandService(partyStore);
    importSvc = new ImportCommandService(importStore, partyStore, partySvc, locationSvc);
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
      correlationId: `corr-imp-${Date.now()}-${Math.random()}`,
      effectiveAt: new Date(),
    };
  }

  async function seedAdmin(scope = 'master_data.admin') {
    const org = await workforceStore.seedOrganization(
      'Import Org',
      `imp-${Date.now()}-${Math.random()}`,
    );
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `imp-${Date.now()}-${Math.random()}@o.bo`,
      'Imp',
      'Admin',
      scope,
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    return { org, admin, c };
  }

  const syntheticRows = [
    {
      section: 'B' as const,
      rowIndex: 0,
      commercialName: 'Synthetic Shop Alpha',
      givenName: 'Contact',
      familyName: 'Alpha',
      celular: '70011111',
      mapsUrl: 'https://www.google.com/maps/@-16.5,-68.15,17z',
    },
    {
      section: 'B' as const,
      rowIndex: 1,
      commercialName: 'Synthetic Shop Beta',
      givenName: 'Contact',
      familyName: 'Beta',
      celular: '70022222',
      mapsUrl: 'https://maps.app.goo.gl/SyntheticShortLink',
    },
    {
      section: 'A' as const,
      rowIndex: 0,
      givenName: 'Staff',
      familyName: 'Candidate',
      email: 'staff.candidate@example.com',
      cargo: 'ASESOR DE VENTA',
    },
  ];

  it('dry-run creates no business party/contact/location records', async () => {
    const { org, c } = await seedAdmin();
    const beforeParties = await prisma.osParty.count({ where: { organizationId: org.id } });
    const beforeContacts = await prisma.osContact.count({ where: { organizationId: org.id } });
    const beforeLocs = await prisma.osLocation.count({ where: { organizationId: org.id } });
    const beforeAuth = await prisma.osAuthIdentity.count();

    const result = await importSvc.execute(
      'DryRunClientImport',
      c,
      {
        sourceKind: 'xls_datos_clientes',
        sourceFingerprint: `fp-dry-${Date.now()}`,
        rows: syntheticRows,
      },
      `idem-dry-${Date.now()}`,
    );

    assert.equal(result.data.mode, 'dry_run');
    assert.equal(result.data.wouldCreate, 2);
    assert.equal(result.data.manualReview, 1);
    assert.equal(result.data.location.withCoords, 1);
    assert.equal(result.data.location.provenanceOnly, 1);
    assert.equal(result.data.staff.blockedAuthCreates, 0);

    assert.equal(
      await prisma.osParty.count({ where: { organizationId: org.id } }),
      beforeParties,
    );
    assert.equal(
      await prisma.osContact.count({ where: { organizationId: org.id } }),
      beforeContacts,
    );
    assert.equal(
      await prisma.osLocation.count({ where: { organizationId: org.id } }),
      beforeLocs,
    );
    assert.equal(await prisma.osAuthIdentity.count(), beforeAuth);

    const batchId = String(result.data.importBatchId);
    const batch = await prisma.osImportBatch.findFirst({
      where: { id: batchId, organizationId: org.id },
    });
    assert.ok(batch);
    assert.equal(batch!.status, 'dry_run');
  });

  it('validate persists validated batch without business creates', async () => {
    const { org, c } = await seedAdmin();
    const result = await importSvc.execute(
      'ValidateClientImport',
      c,
      {
        sourceKind: 'xls_datos_clientes',
        sourceFingerprint: `fp-val-${Date.now()}`,
        rows: syntheticRows,
      },
      `idem-val-${Date.now()}`,
    );
    assert.equal(result.data.mode, 'validate');
    const batch = await prisma.osImportBatch.findFirst({
      where: { id: String(result.data.importBatchId), organizationId: org.id },
    });
    assert.equal(batch?.status, 'validated');
    assert.equal(await prisma.osParty.count({ where: { organizationId: org.id } }), 0);
  });

  it('execute blocked when OS_REAL_CLIENT_IMPORT_ENABLED is not true', async () => {
    const { c } = await seedAdmin();
    const prev = process.env.OS_REAL_CLIENT_IMPORT_ENABLED;
    delete process.env.OS_REAL_CLIENT_IMPORT_ENABLED;
    const dry = await importSvc.execute(
      'DryRunClientImport',
      c,
      {
        sourceKind: 'xls_datos_clientes',
        sourceFingerprint: `fp-block-${Date.now()}`,
        rows: [syntheticRows[0]!],
      },
      `idem-block-dry-${Date.now()}`,
    );
    await assert.rejects(
      () =>
        importSvc.execute(
          'ExecuteClientImport',
          c,
          { importBatchId: String(dry.data.importBatchId) },
          `idem-block-exec-${Date.now()}`,
        ),
      (err: unknown) => err instanceof Error && err.message === 'IMPORT_DISABLED',
    );
    if (prev !== undefined) process.env.OS_REAL_CLIENT_IMPORT_ENABLED = prev;
  });

  it('master_data.admin required', async () => {
    const { c } = await seedAdmin('people.admin');
    await assert.rejects(
      () =>
        importSvc.execute(
          'DryRunClientImport',
          c,
          {
            sourceKind: 'xls_datos_clientes',
            sourceFingerprint: `fp-perm-${Date.now()}`,
            rows: [syntheticRows[0]!],
          },
          `idem-perm-${Date.now()}`,
        ),
      (err: unknown) => err instanceof Error && err.message === 'PERMISSION_DENIED',
    );
  });

  it('cross-tenant batch denied', async () => {
    const a = await seedAdmin();
    const b = await seedAdmin();
    const dry = await importSvc.execute(
      'DryRunClientImport',
      a.c,
      {
        sourceKind: 'xls_datos_clientes',
        sourceFingerprint: `fp-x-${Date.now()}`,
        rows: [syntheticRows[0]!],
      },
      `idem-x-dry-${Date.now()}`,
    );
    await assert.rejects(
      () =>
        importSvc.execute(
          'GetImportBatchReceipt',
          b.c,
          { importBatchId: String(dry.data.importBatchId) },
          `idem-x-get-${Date.now()}`,
        ),
      (err: unknown) => err instanceof Error && err.message === 'NOT_FOUND',
    );
  });

  it('execute + location integration + rollback only batch-created; never AuthIdentity/Invite', async () => {
    const { org, c } = await seedAdmin();
    const prev = process.env.OS_REAL_CLIENT_IMPORT_ENABLED;
    process.env.OS_REAL_CLIENT_IMPORT_ENABLED = 'true';

    // Pre-existing MATCH target — must survive rollback
    const existing = await partySvc.execute(
      'CreateParty',
      c,
      {
        partyKind: 'organization',
        displayName: 'Preexisting Match Shop',
        initialRoleKey: 'customer',
        createCommercialAccount: true,
      },
      `idem-pre-${Date.now()}`,
    );
    const existingPartyId = String(existing.data.partyId);
    await partySvc.execute(
      'UpdateContact',
      c,
      {
        organizationPartyId: existingPartyId,
        givenName: 'Pre',
        familyName: 'Exist',
        phone: { country: 'BO', number: '+59170033333' },
        whatsapp: { country: 'BO', number: '+59170033333' },
      },
      `idem-pre-c-${Date.now()}`,
    );

    const authBefore = await prisma.osAuthIdentity.count();
    const membersBefore = await prisma.osOrganizationMember.count({
      where: { organizationId: org.id },
    });

    const dry = await importSvc.execute(
      'ValidateClientImport',
      c,
      {
        sourceKind: 'xls_datos_clientes',
        sourceFingerprint: `fp-exec-${Date.now()}`,
        rows: [
          {
            section: 'B',
            rowIndex: 0,
            commercialName: 'Created By Import',
            givenName: 'New',
            familyName: 'Contact',
            celular: '70044444',
            mapsUrl: 'https://maps.app.goo.gl/ProvOnly',
          },
          {
            section: 'B',
            rowIndex: 1,
            commercialName: 'Preexisting Match Shop',
            givenName: 'Pre',
            familyName: 'Exist',
            celular: '70033333',
          },
          {
            section: 'A',
            rowIndex: 0,
            givenName: 'No',
            familyName: 'Invite',
            email: 'never.invite@example.com',
          },
        ],
      },
      `idem-exec-val-${Date.now()}`,
    );

    assert.equal(dry.data.wouldCreate, 1);
    assert.equal(dry.data.matched, 1);
    assert.equal(dry.data.manualReview, 1);

    const exec = await importSvc.execute(
      'ExecuteClientImport',
      c,
      { importBatchId: String(dry.data.importBatchId) },
      `idem-exec-${Date.now()}`,
    );
    assert.equal(exec.data.created, 1);
    assert.equal(exec.data.mode, 'execute');

    const createdParty = await prisma.osParty.findFirst({
      where: { organizationId: org.id, displayName: 'Created By Import', status: 'active' },
    });
    assert.ok(createdParty);
    const createdLoc = await prisma.osLocation.findFirst({
      where: { organizationId: org.id, partyId: createdParty!.id },
    });
    assert.ok(createdLoc);
    assert.equal(createdLoc!.latitude, null);
    assert.equal(createdLoc!.longitude, null);
    assert.ok(createdLoc!.provenanceUrl);

    assert.equal(await prisma.osAuthIdentity.count(), authBefore);
    assert.equal(
      await prisma.osOrganizationMember.count({ where: { organizationId: org.id } }),
      membersBefore,
    );

    const matchStillActive = await prisma.osParty.findFirst({
      where: { id: existingPartyId, status: 'active' },
    });
    assert.ok(matchStillActive);

    const rev1 = await importSvc.execute(
      'ReverseImportBatch',
      c,
      { importBatchId: String(dry.data.importBatchId) },
      `idem-rev-1-${Date.now()}`,
    );
    assert.equal(rev1.data.mode, 'rollback');
    assert.ok((rev1.data.reversed as { parties: number }).parties >= 1);

    const createdAfter = await prisma.osParty.findFirst({
      where: { id: createdParty!.id },
    });
    assert.equal(createdAfter?.status, 'inactive');
    const locAfter = await prisma.osLocation.findFirst({ where: { id: createdLoc!.id } });
    assert.equal(locAfter?.status, 'inactive');

    const matchAfterRollback = await prisma.osParty.findFirst({
      where: { id: existingPartyId, status: 'active' },
    });
    assert.ok(matchAfterRollback);

    const rev2 = await importSvc.execute(
      'ReverseImportBatch',
      c,
      { importBatchId: String(dry.data.importBatchId) },
      `idem-rev-2-${Date.now()}`,
    );
    assert.equal(rev2.data.mode, 'rollback');

    assert.equal(await prisma.osAuthIdentity.count(), authBefore);

    if (prev === undefined) delete process.env.OS_REAL_CLIENT_IMPORT_ENABLED;
    else process.env.OS_REAL_CLIENT_IMPORT_ENABLED = prev;
  });

  it('T03 L3: reversal refuses before any write while a created customer has an open obligation', async () => {
    const { org, admin, c } = await seedAdmin();
    const prev = process.env.OS_REAL_CLIENT_IMPORT_ENABLED;
    process.env.OS_REAL_CLIENT_IMPORT_ENABLED = 'true';
    const dry = await importSvc.execute(
      'ValidateClientImport',
      c,
      {
        sourceKind: 'xls_datos_clientes',
        sourceFingerprint: `fp-l3-${Date.now()}`,
        rows: [
          { section: 'B', rowIndex: 0, commercialName: 'Obligada L3', givenName: 'Ana', familyName: 'Obligada', celular: '70055501', mapsUrl: 'https://maps.app.goo.gl/L3One' },
          { section: 'B', rowIndex: 1, commercialName: 'Libre L3', givenName: 'Luis', familyName: 'Libre', celular: '70055502', mapsUrl: 'https://maps.app.goo.gl/L3Two' },
        ],
      },
      `idem-l3-val-${Date.now()}`,
    );
    const importBatchId = String(dry.data.importBatchId);
    await importSvc.execute('ExecuteClientImport', c, { importBatchId }, `idem-l3-exec-${Date.now()}`);
    const created = await prisma.osParty.findMany({ where: { organizationId: org.id, status: 'active' }, orderBy: { displayName: 'asc' } });
    assert.deepEqual(created.map((p) => p.displayName), ['Libre L3', 'Obligada L3']);
    const obligated = created[1]!;
    const commitmentId = `l3-commitment-${Date.now()}`;
    await prisma.osCommitment.create({
      data: {
        id: commitmentId,
        organizationId: org.id,
        partyId: obligated.id,
        ownerMemberId: admin.member.id,
        text: 'Entregar pedido pendiente',
        origin: 'employee_entered',
        createdByMemberId: admin.member.id,
      },
    });
    const snapshot = async () => ({
      parties: (await prisma.osParty.findMany({ where: { organizationId: org.id }, orderBy: { id: 'asc' } })).map((p) => [p.status, p.version]),
      contacts: (await prisma.osContact.findMany({ where: { organizationId: org.id }, orderBy: { id: 'asc' } })).map((x) => x.status),
      locations: (await prisma.osLocation.findMany({ where: { organizationId: org.id }, orderBy: { id: 'asc' } })).map((x) => x.status),
    });
    const before = await snapshot();
    await assert.rejects(
      () => importSvc.execute('ReverseImportBatch', c, { importBatchId }, `idem-l3-rev-1-${Date.now()}`),
      (err: Error) => err.message === 'ARCHIVE_BLOCKED_BY_OBLIGATIONS',
    );
    assert.deepEqual(await snapshot(), before);
    assert.equal(await prisma.osBusinessEvent.count({ where: { organizationId: org.id, eventType: 'party.deactivated' } }), 0);

    await prisma.osCommitment.update({ where: { id: commitmentId }, data: { lifecycle: 'fulfilled', fulfilledAt: new Date() } });
    const reversed = await importSvc.execute('ReverseImportBatch', c, { importBatchId }, `idem-l3-rev-2-${Date.now()}`);
    assert.equal((reversed.data.reversed as { parties: number }).parties, 2);
    const after = await prisma.osParty.findMany({ where: { organizationId: org.id }, orderBy: { displayName: 'asc' } });
    assert.deepEqual(after.map((p) => [p.displayName, p.status, p.version]), [['Libre L3', 'inactive', 1], ['Obligada L3', 'inactive', 1]]);
    const events = await prisma.osBusinessEvent.findMany({ where: { organizationId: org.id, eventType: 'party.deactivated' } });
    assert.deepEqual(events.map((e) => (e.payloadJson as Record<string, unknown>).reason), ['other', 'other']);

    if (prev === undefined) delete process.env.OS_REAL_CLIENT_IMPORT_ENABLED;
    else process.env.OS_REAL_CLIENT_IMPORT_ENABLED = prev;
  });
});
