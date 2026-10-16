import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createId } from '@isalwa/ts-utils';
import {
  getOsPrisma,
  PrismaOsPartyStore,
  PrismaOsWorkforceStore,
  PrismaOsImportStore,
} from './index';
import { LocationCommandService, PartyCommandService } from '@isalwa/os-party';
import { ImportCommandService } from '@isalwa/os-import';
import { REPLAY_REVIEW_REQUIRED } from '@isalwa/os-events';
import type { RequestContext } from '@isalwa/os-contracts';

/**
 * S11 v2 replay binding against real Postgres (unique key on organization_id + key).
 * Party saves the key inside its transaction; import claims the key before any write.
 */
const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

describePrisma('S11 replay binding (prisma)', () => {
  let prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
  let workforceStore: PrismaOsWorkforceStore;
  let partyStore: PrismaOsPartyStore;
  let partySvc: PartyCommandService;
  let importSvc: ImportCommandService;

  before(async () => {
    prisma = getOsPrisma()!;
    workforceStore = new PrismaOsWorkforceStore(prisma);
    partyStore = new PrismaOsPartyStore(prisma);
    partySvc = new PartyCommandService(partyStore);
    const locationSvc = new LocationCommandService(partyStore);
    importSvc = new ImportCommandService(
      new PrismaOsImportStore(prisma),
      partyStore,
      partySvc,
      locationSvc,
    );
    await workforceStore.truncateAll();
  });

  function ctx(orgId: string, m: { member: { id: string }; person: { id: string }; auth: { id: string } }): RequestContext {
    return {
      organizationId: orgId,
      actorMemberId: m.member.id,
      personId: m.person.id,
      authIdentityId: m.auth.id,
      correlationId: `corr-s11-${createId()}`,
      effectiveAt: new Date(),
    };
  }

  async function seedOrg() {
    const org = await workforceStore.seedOrganization('S11 Org', `s11-${createId()}`);
    const seed = () =>
      workforceStore.seedScopedAdminMember(org.id, `s11-${createId()}@o.bo`, 'S', 'Once', 'master_data.admin');
    const a = await seed();
    const b = await seed();
    return { org, a, b, ca: ctx(org.id, a), cb: ctx(org.id, b) };
  }

  const party = (displayName: string) => ({
    partyKind: 'organization',
    displayName,
    initialRoleKey: 'customer',
  });

  const parties = (orgId: string) => prisma.osParty.count({ where: { organizationId: orgId } });
  const events = (orgId: string) => prisma.osBusinessEvent.count({ where: { organizationId: orgId } });

  it('same actor, command, and payload replays the stored result without a second write', async () => {
    const { org, ca } = await seedOrg();
    const first = await partySvc.execute('CreateParty', ca, party('Replay SA'), 'k-same');
    const ev = await events(org.id);
    const again = await partySvc.execute('CreateParty', { ...ca, correlationId: 'c2' }, party('Replay SA'), 'k-same');
    // Stored as JSON: undefined fields are dropped, every defined field round-trips.
    assert.deepEqual(again, JSON.parse(JSON.stringify(first)));
    assert.equal(await parties(org.id), 1);
    assert.equal(await events(org.id), ev);
    const row = await prisma.osIdempotencyKey.findFirst({ where: { organizationId: org.id, key: 'k-same' } });
    const env = (row!.resultJson as Record<string, Record<string, unknown>>).__s11Replay!;
    assert.equal(env.v, 2);
    assert.equal(env.actorMemberId, ca.actorMemberId);
    assert.equal(env.command, 'CreateParty');
    assert.match(String(env.fingerprint), /^[0-9a-f]{64}$/);
  });

  it('a different actor with the same key gets CONFLICT and no body', async () => {
    const { org, ca, cb } = await seedOrg();
    await partySvc.execute('CreateParty', ca, party('Owner A'), 'k-actor');
    await assert.rejects(
      partySvc.execute('CreateParty', cb, party('Owner A'), 'k-actor'),
      (err: Error) => err.message === 'CONFLICT',
    );
    assert.equal(await parties(org.id), 1);
  });

  it('same actor, different payload on the same key is CONFLICT', async () => {
    const { org, ca } = await seedOrg();
    await partySvc.execute('CreateParty', ca, party('Uno'), 'k-payload');
    await assert.rejects(
      partySvc.execute('CreateParty', ca, party('Dos'), 'k-payload'),
      (err: Error) => err.message === 'CONFLICT',
    );
    assert.equal(await parties(org.id), 1);
  });

  it('a stored row bound to another command is CONFLICT', async () => {
    const { org, ca } = await seedOrg();
    await partySvc.execute('CreateParty', ca, party('Cmd'), 'k-cmd');
    const row = await prisma.osIdempotencyKey.findFirst({ where: { organizationId: org.id, key: 'k-cmd' } });
    const json = row!.resultJson as Record<string, Record<string, unknown>>;
    json.__s11Replay!.command = 'UpdateParty';
    await prisma.osIdempotencyKey.update({ where: { id: row!.id }, data: { resultJson: json as never } });
    await assert.rejects(
      partySvc.execute('CreateParty', ca, party('Cmd'), 'k-cmd'),
      (err: Error) => err.message === 'CONFLICT',
    );
    assert.equal(await parties(org.id), 1);
  });

  it('the original actor whose permission was revoked gets PERMISSION_DENIED, not the stored body', async () => {
    const { org, a, ca } = await seedOrg();
    await partySvc.execute('CreateParty', ca, party('Revoked'), 'k-revoked');
    await prisma.osRoleAssignment.updateMany({
      where: { organizationId: org.id, memberId: a.member.id, roleKey: 'master_data.admin' },
      data: { endedAt: new Date(Date.now() - 1000) },
    });
    await assert.rejects(
      partySvc.execute('CreateParty', ca, party('Revoked'), 'k-revoked'),
      (err: Error) => err.message === 'PERMISSION_DENIED',
    );
    assert.equal(await parties(org.id), 1);
  });

  it('the same key in another tenant runs independently and never returns tenant A data', async () => {
    const one = await seedOrg();
    const two = await seedOrg();
    const r1 = await partySvc.execute('CreateParty', one.ca, party('Tenant'), 'k-tenant');
    const r2 = await partySvc.execute('CreateParty', two.ca, party('Tenant'), 'k-tenant');
    assert.notEqual(r2.data.partyId, r1.data.partyId);
    const p2 = await prisma.osParty.findUnique({ where: { id: String(r2.data.partyId) } });
    assert.equal(p2!.organizationId, two.org.id);
    assert.equal(await parties(one.org.id), 1);
    assert.equal(await parties(two.org.id), 1);
  });

  it('a pre-binding legacy row is neither replayed nor re-run: REPLAY_REVIEW_REQUIRED', async () => {
    const { org, ca } = await seedOrg();
    await prisma.osIdempotencyKey.create({
      data: {
        id: createId(),
        organizationId: org.id,
        key: 'k-legacy',
        commandName: 'CreateParty',
        resultJson: { ok: true, data: { partyId: 'legacy-secret' } } as never,
        expiresAt: new Date(Date.now() + 86400_000),
      },
    });
    await assert.rejects(
      partySvc.execute('CreateParty', ca, party('Legacy'), 'k-legacy'),
      (err: Error) => err.message === REPLAY_REVIEW_REQUIRED && !err.message.includes('legacy-secret'),
    );
    assert.equal(await parties(org.id), 0);
  });

  it('8 overlapping same-actor requests on one key create exactly one party', async () => {
    const { org, ca } = await seedOrg();
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        partySvc.execute('CreateParty', { ...ca, correlationId: `race-${i}` }, party('Race'), 'k-race'),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<{ data: { partyId: string } }>[];
    const bad = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    console.log(`[evidence] party race: fulfilled=${ok.length} rejected=${bad.map((r) => r.reason.message).join(',') || 'none'}`);
    assert.ok(ok.length >= 1);
    for (const r of ok) assert.equal(r.value.data.partyId, ok[0]!.value.data.partyId);
    for (const r of bad) assert.equal(r.reason.message, 'CONFLICT');
    assert.equal(await parties(org.id), 1);
  });

  const rows = [
    { section: 'B' as const, rowIndex: 0, commercialName: 'S11 Shop', givenName: 'C', familyName: 'A', celular: '70011111' },
  ];
  const dry = (fp: string) => ({ sourceKind: 'xls_datos_clientes', sourceFingerprint: fp, rows });
  const batches = (orgId: string) => prisma.osImportBatch.count({ where: { organizationId: orgId } });

  it('import claim-first: overlapping same-actor and other-actor requests write one batch; a later retry replays', async () => {
    const { org, ca, cb } = await seedOrg();
    const results = await Promise.allSettled([
      importSvc.execute('DryRunClientImport', ca, dry('fp-race'), 'imp-race'),
      importSvc.execute('DryRunClientImport', ca, dry('fp-race'), 'imp-race'),
      importSvc.execute('DryRunClientImport', ca, dry('fp-race'), 'imp-race'),
      importSvc.execute('DryRunClientImport', cb, dry('fp-race'), 'imp-race'),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<{ data: Record<string, unknown> }>[];
    const bad = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    console.log(`[evidence] import race: fulfilled=${ok.length} rejected=${bad.map((r) => r.reason.message).join(',') || 'none'}`);
    assert.equal(await batches(org.id), 1);
    for (const r of bad) assert.equal(r.reason.message, 'CONFLICT');
    // Whichever actor claims the key first owns it; the other actor only ever gets CONFLICT.
    const sameActor = results.slice(0, 3);
    const otherActor = results[3]!;
    const winnerIsOther = otherActor.status === 'fulfilled';
    if (winnerIsOther) {
      for (const r of sameActor) assert.equal(r.status, 'rejected');
    } else {
      assert.equal(otherActor.status, 'rejected');
      assert.ok(sameActor.some((r) => r.status === 'fulfilled'));
    }
    const batchIds = new Set(ok.map((r) => r.value.data.importBatchId));
    assert.equal(batchIds.size, 1);
    const [winner, loser] = winnerIsOther ? [cb, ca] : [ca, cb];
    const retry = await importSvc.execute('DryRunClientImport', winner, dry('fp-race'), 'imp-race');
    assert.equal(retry.data.importBatchId, ok[0]!.value.data.importBatchId);
    await assert.rejects(
      importSvc.execute('DryRunClientImport', loser, dry('fp-race'), 'imp-race'),
      (err: Error) => err.message === 'CONFLICT',
    );
    assert.equal(await batches(org.id), 1);
  });

  it('import claim-first: a failed run releases the claim and the key can run again', async () => {
    const { org, ca } = await seedOrg();
    await assert.rejects(
      importSvc.execute('ExecuteClientImport', ca, { importBatchId: 'missing-batch' }, 'imp-fail'),
    );
    assert.equal(
      await prisma.osIdempotencyKey.count({ where: { organizationId: org.id, key: 'imp-fail' } }),
      0,
    );
    await importSvc.execute('DryRunClientImport', ca, dry('fp-after-fail'), 'imp-fail');
    assert.equal(await batches(org.id), 1);
  });
});
