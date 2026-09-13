import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { getOsPrisma, PrismaOsPartyStore, PrismaOsWorkforceStore } from './index';
import { LocationCommandService, PartyCommandService } from '@isalwa/os-party';
import type { RequestContext } from '@isalwa/os-contracts';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('location prisma integration', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let workforceStore: PrismaOsWorkforceStore;
  let partyStore: PrismaOsPartyStore;
  let partySvc: PartyCommandService;
  let locationSvc: LocationCommandService;

  before(async () => {
    prisma = getOsPrisma()!;
    workforceStore = new PrismaOsWorkforceStore(prisma);
    partyStore = new PrismaOsPartyStore(prisma);
    partySvc = new PartyCommandService(partyStore);
    locationSvc = new LocationCommandService(partyStore);
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
      correlationId: `corr-loc-${Date.now()}-${Math.random()}`,
      effectiveAt: new Date(),
    };
  }

  async function seedOrgAdmin() {
    const org = await workforceStore.seedOrganization('Loc Org', `loc-${Date.now()}-${Math.random()}`);
    const admin = await workforceStore.seedScopedAdminMember(
      org.id,
      `loc-${Date.now()}-${Math.random()}@o.bo`,
      'Loc',
      'Admin',
      'master_data.admin',
    );
    const c = ctx(org.id, admin.member.id, admin.person.id, admin.auth.id);
    return { org, admin, c };
  }

  async function createParty(c: RequestContext, displayName: string) {
    const created = await partySvc.execute('CreateParty', c, {
      partyKind: 'organization',
      displayName,
      initialRoleKey: 'customer',
    });
    return String(created.data.partyId);
  }

  it('creates first location with event audit outbox', async () => {
    const { org, c } = await seedOrgAdmin();
    const partyId = await createParty(c, 'First Loc Party');
    const beforeEvents = await prisma.osBusinessEvent.count({ where: { organizationId: org.id } });
    const beforeAudits = await prisma.osAuditLog.count({ where: { organizationId: org.id } });
    const beforeOutbox = await prisma.osOutboxMessage.count({ where: { organizationId: org.id } });

    const result = await locationSvc.execute(
      'CreateLocation',
      c,
      {
        partyId,
        label: 'Sucursal Centro',
        addressText: 'Calle 1',
        latitude: -16.5,
        longitude: -68.15,
        provenanceUrl: 'https://maps.google.com/?q=-16.5,-68.15',
      },
      `idem-loc-create-${Date.now()}`,
    );

    const locationId = String(result.data.locationId);
    assert.ok(locationId);
    const location = await partyStore.getLocationInOrg(org.id, locationId);
    assert.equal(location?.label, 'Sucursal Centro');
    assert.equal(location?.partyId, partyId);
    assert.equal(location?.latitude, -16.5);
    assert.equal(location?.longitude, -68.15);
    assert.equal(location?.provenanceUrl, 'https://maps.google.com/?q=-16.5,-68.15');
    assert.equal(location?.status, 'active');

    const events = await prisma.osBusinessEvent.count({ where: { organizationId: org.id } });
    const audits = await prisma.osAuditLog.count({ where: { organizationId: org.id } });
    const outbox = await prisma.osOutboxMessage.count({ where: { organizationId: org.id } });
    assert.equal(events, beforeEvents + 1);
    assert.equal(audits, beforeAudits + 1);
    assert.equal(outbox, beforeOutbox + 1);

    const event = await prisma.osBusinessEvent.findFirst({
      where: { organizationId: org.id, eventType: 'location.created' },
      orderBy: { occurredAt: 'desc' },
    });
    assert.ok(event?.idempotencyKey);
    assert.equal(event?.correlationId, result.correlationId);
    assert.equal(event?.primaryEntityId, locationId);
  });

  it('allows multiple locations on same party', async () => {
    const { org, c } = await seedOrgAdmin();
    const partyId = await createParty(c, 'Multi Loc Party');
    const first = await locationSvc.execute('CreateLocation', c, {
      partyId,
      label: 'Store A',
      latitude: -16.4,
      longitude: -68.1,
    });
    const second = await locationSvc.execute('CreateLocation', c, {
      partyId,
      label: 'Store B',
      latitude: -16.6,
      longitude: -68.2,
    });
    assert.notEqual(first.data.locationId, second.data.locationId);
    const locations = await partyStore.listLocationsForParty(org.id, partyId);
    assert.equal(locations.length, 2);
    assert.ok(locations.some((l) => l.label === 'Store A'));
    assert.ok(locations.some((l) => l.label === 'Store B'));
  });

  it('updates location fields', async () => {
    const { org, c } = await seedOrgAdmin();
    const partyId = await createParty(c, 'Update Loc Party');
    const created = await locationSvc.execute('CreateLocation', c, {
      partyId,
      label: 'Old Label',
      latitude: -16.0,
      longitude: -68.0,
    });
    const locationId = String(created.data.locationId);
    await locationSvc.execute('UpdateLocation', c, {
      locationId,
      label: 'New Label',
      addressText: 'Av. Nueva',
      latitude: -16.1,
      longitude: -68.1,
      expectedVersion: 0,
    });
    const location = await partyStore.getLocationInOrg(org.id, locationId);
    assert.equal(location?.label, 'New Label');
    assert.equal(location?.addressText, 'Av. Nueva');
    assert.equal(location?.latitude, -16.1);
    assert.equal(location?.longitude, -68.1);
    assert.equal(location?.version, 1);

    const event = await prisma.osBusinessEvent.findFirst({
      where: { organizationId: org.id, eventType: 'location.updated' },
      orderBy: { occurredAt: 'desc' },
    });
    assert.ok(event);
  });

  it('deactivates location', async () => {
    const { org, c } = await seedOrgAdmin();
    const partyId = await createParty(c, 'Deactivate Loc Party');
    const created = await locationSvc.execute('CreateLocation', c, {
      partyId,
      label: 'To Deactivate',
    });
    const locationId = String(created.data.locationId);
    await locationSvc.execute('DeactivateLocation', c, { locationId });
    const location = await partyStore.getLocationInOrg(org.id, locationId);
    assert.equal(location?.status, 'inactive');

    const event = await prisma.osBusinessEvent.findFirst({
      where: { organizationId: org.id, eventType: 'location.deactivated' },
      orderBy: { occurredAt: 'desc' },
    });
    assert.ok(event);
  });

  it('allows latitude/longitude optional', async () => {
    const { org, c } = await seedOrgAdmin();
    const partyId = await createParty(c, 'Optional Coords Party');
    const created = await locationSvc.execute('CreateLocation', c, {
      partyId,
      label: 'No Coords Yet',
    });
    const location = await partyStore.getLocationInOrg(org.id, String(created.data.locationId));
    assert.equal(location?.latitude, null);
    assert.equal(location?.longitude, null);
  });

  it('preserves short map provenanceUrl without coordinates', async () => {
    const { org, c } = await seedOrgAdmin();
    const partyId = await createParty(c, 'Short Url Party');
    const shortUrl = 'https://maps.app.goo.gl/AbCdEfGhIjKlMnOp';
    const created = await locationSvc.execute('CreateLocation', c, {
      partyId,
      label: 'GPS from XLS',
      provenanceUrl: shortUrl,
    });
    const location = await partyStore.getLocationInOrg(org.id, String(created.data.locationId));
    assert.equal(location?.provenanceUrl, shortUrl);
    assert.equal(location?.latitude, null);
    assert.equal(location?.longitude, null);
  });

  it('rejects cross-tenant write', async () => {
    const a = await seedOrgAdmin();
    const b = await seedOrgAdmin();
    const partyId = await createParty(a.c, 'Tenant A Party');
    await assert.rejects(
      () =>
        locationSvc.execute('CreateLocation', b.c, {
          partyId,
          label: 'Evil cross write',
        }),
      (err: Error) => err.message === 'NOT_FOUND',
    );
    const locations = await partyStore.listLocationsForParty(a.org.id, partyId);
    assert.equal(locations.length, 0);
  });

  it('rejects cross-tenant read without existence leak', async () => {
    const a = await seedOrgAdmin();
    const b = await seedOrgAdmin();
    const partyId = await createParty(a.c, 'Tenant A Read Party');
    const created = await locationSvc.execute('CreateLocation', a.c, {
      partyId,
      label: 'Secret Loc',
      latitude: -16.2,
      longitude: -68.3,
    });
    const locationId = String(created.data.locationId);

    const leaked = await partyStore.getLocationInOrg(b.org.id, locationId);
    assert.equal(leaked, null);

    await assert.rejects(
      () =>
        locationSvc.execute('UpdateLocation', b.c, {
          locationId,
          label: 'Hijack',
          expectedVersion: 0,
        }),
      (err: Error) => err.message === 'NOT_FOUND',
    );
  });

  it('fails closed on foreign party id', async () => {
    const { c } = await seedOrgAdmin();
    await assert.rejects(
      () =>
        locationSvc.execute('CreateLocation', c, {
          partyId: 'party-does-not-exist',
          label: 'Orphan',
        }),
      (err: Error) => err.message === 'NOT_FOUND',
    );
  });

  it('emits no location event on validation failure', async () => {
    const { org, c } = await seedOrgAdmin();
    const partyId = await createParty(c, 'Validation Fail Party');
    await partySvc.execute('DeactivateParty', c, { partyId });
    const before = await prisma.osBusinessEvent.count({
      where: { organizationId: org.id, eventType: { startsWith: 'location.' } },
    });
    await assert.rejects(
      () =>
        locationSvc.execute('CreateLocation', c, {
          partyId,
          label: 'On inactive party',
        }),
      (err: Error) => err.message === 'VALIDATION_FAILED',
    );
    const after = await prisma.osBusinessEvent.count({
      where: { organizationId: org.id, eventType: { startsWith: 'location.' } },
    });
    assert.equal(after, before);
    const audits = await prisma.osAuditLog.count({
      where: { organizationId: org.id, action: { startsWith: 'location.' } },
    });
    assert.equal(audits, 0);
  });

  it('rejects actor from other org (tenant boundary)', async () => {
    const a = await seedOrgAdmin();
    const b = await seedOrgAdmin();
    await assert.rejects(
      () =>
        locationSvc.execute(
          'CreateLocation',
          ctx(b.org.id, a.admin.member.id, a.admin.person.id, a.admin.auth.id),
          { partyId: 'x', label: 'Nope' },
        ),
      (err: Error) => err.message === 'TENANT_FORBIDDEN',
    );
  });
});
