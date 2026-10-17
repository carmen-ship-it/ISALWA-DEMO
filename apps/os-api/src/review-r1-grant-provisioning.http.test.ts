import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { getOsPrisma } from '@isalwa/os-database';
import { createId } from '@isalwa/ts-utils';

/**
 * Review R1 (F03/F04, 2026-10-16 20:03): grant provisioning. A people administrator
 * cannot hand out, or take, commercial authority they do not independently hold.
 * A grantor who holds it provisions a team manager through the real commands, and
 * that manager then works over HTTP. Real Nest app, real disposable Postgres.
 *
 * The grantor's own scopes are a synthetic fixture: under independent possession the
 * first holder of each commercial scope is provisioned out of band.
 */
const describeHttp = process.env.OS_DATABASE_URL ? describe : describe.skip;

type Seeded = { member: { id: string }; person: { id: string }; auth: { id: string } };
type Reply = { status: number; body: Record<string, unknown> };

const MANAGER_SCOPES = ['commercial.team.read', 'commercial.customer.edit', 'commercial.work.manage'] as const;
const DENIED = [403, { code: 'PERMISSION_DENIED' }];

describeHttp('Review R1 grant provisioning over HTTP (disposable Postgres)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  let org: { id: string };
  const m: Record<string, Seeded> = {};
  const phone = () => `6${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 10)}`;

  function headers(who: Seeded, key?: string): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': org.id,
      'x-os-member-id': who.member.id,
      'x-os-person-id': who.person.id,
      'x-os-auth-identity-id': who.auth.id,
      ...(key ? { 'idempotency-key': key } : {}),
    };
  }

  async function command(who: string, name: string, body: Record<string, unknown>): Promise<Reply> {
    const res = await fetch(`${baseUrl}/v1/commands/${name}`, {
      method: 'POST',
      headers: headers(m[who]!, `r1-${createId()}`),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  async function seedMember(name: string, roleKeys: readonly string[]): Promise<Seeded> {
    const seeded = await store.seedAdminMember(org.id, `${name}-${createId()}@r1.bo`, name, 'R1');
    if (!roleKeys.includes('people.admin')) {
      await prisma().osRoleAssignment.deleteMany({
        where: { organizationId: org.id, memberId: seeded.member.id, roleKey: 'people.admin' },
      });
    }
    for (const roleKey of roleKeys.filter((key) => key !== 'people.admin')) {
      await prisma().osRoleAssignment.create({
        data: { id: createId(), organizationId: org.id, memberId: seeded.member.id, roleKey, effectiveAt: new Date('2020-01-01') },
      });
    }
    return seeded;
  }

  const activeKeys = async (who: string) =>
    (
      await prisma().osRoleAssignment.findMany({
        where: { organizationId: org.id, memberId: m[who]!.member.id, endedAt: null },
        select: { roleKey: true },
      })
    )
      .map((row) => row.roleKey)
      .sort();

  const writes = async () => [
    await prisma().osRoleAssignment.count({ where: { organizationId: org.id } }),
    await prisma().osManagerAssignment.count({ where: { organizationId: org.id } }),
    await prisma().osBusinessEvent.count({ where: { organizationId: org.id } }),
  ];

  async function customerOf(who: string, name: string): Promise<string> {
    const created = await command(who, 'CreateParty', {
      partyKind: 'organization',
      displayName: name,
      contact: { givenName: 'Rosa', familyName: 'Quispe' },
      phone: phone(),
      city: 'Santa Cruz de la Sierra',
      department: 'Santa Cruz',
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    return String((created.body.data as Record<string, unknown>).partyId);
  }

  const state = { partyId: '', readPartyId: '' };

  before(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
    store = moduleRef.get(OS_STORE);
    org = await store.seedOrganization('R1 Org', `r1-${createId()}`);
    m.rrhh = await seedMember('rrhh', ['people.admin']);
    // Org range (Gerencia-like): a grantor may only hand out reach it holds itself.
    m.grantor = await seedMember('grantor', ['people.admin', 'commercial.org.read', ...MANAGER_SCOPES]);
    m.teamGrantor = await seedMember('teamGrantor', ['people.admin', ...MANAGER_SCOPES]);
    m.seller = await seedMember('seller', ['commercial.customer.create', 'commercial.quote.convert.own']);
    m.seller2 = await seedMember('seller2', ['commercial.customer.create']);
    m.candidate = await seedMember('candidate', ['sales_manager']);
    m.readCandidate = await seedMember('readCandidate', ['sales_manager']);
    state.partyId = await customerOf('seller', 'Ferretería Norte R1');
    state.readPartyId = await customerOf('seller2', 'Ladrillera Sur R1');
  });

  after(async () => {
    await app.close();
  });

  it('people.admin alone cannot grant commercial scopes to another member or to themselves (403, no rows)', async () => {
    const before = await writes();
    for (const roleKey of [...MANAGER_SCOPES, 'commercial.assignment.org', 'commercial.order.convert']) {
      for (const target of ['candidate', 'rrhh']) {
        const reply = await command('rrhh', 'GrantAdditionalRole', { memberId: m[target]!.member.id, roleKey });
        assert.deepEqual([reply.status, reply.body], DENIED, `GrantAdditionalRole ${roleKey} -> ${target}`);
      }
      const viaRole = await command('rrhh', 'ChangeRole', { memberId: m.candidate!.member.id, roleKey });
      assert.deepEqual([viaRole.status, viaRole.body], DENIED, `ChangeRole ${roleKey}`);
    }
    const selfManager = await command('rrhh', 'ChangeManager', {
      memberId: m.seller!.member.id,
      managerMemberId: m.rrhh!.member.id,
    });
    assert.deepEqual([selfManager.status, selfManager.body], DENIED);
    assert.deepEqual(await writes(), before);
    assert.deepEqual(await activeKeys('rrhh'), ['people.admin']);
    assert.deepEqual(await activeKeys('candidate'), ['sales_manager']);
  });

  it('a grantor cannot grant to themselves even what they already hold', async () => {
    const before = await writes();
    const reply = await command('grantor', 'GrantAdditionalRole', {
      memberId: m.grantor!.member.id,
      roleKey: 'commercial.work.manage',
    });
    assert.deepEqual([reply.status, reply.body], DENIED);
    assert.deepEqual(await writes(), before);
  });

  it('before provisioning, the candidate cannot edit or quote the customer', async () => {
    const party = await prisma().osParty.findUniqueOrThrow({ where: { id: state.partyId } });
    const edit = await command('candidate', 'UpdateParty', { partyId: state.partyId, displayName: 'x', expectedVersion: party.version });
    assert.notEqual(edit.status, 201);
    const quote = await command('candidate', 'CreateQuote', { partyId: state.partyId });
    assert.notEqual(quote.status, 201);
    assert.equal((await prisma().osParty.findUniqueOrThrow({ where: { id: state.partyId } })).displayName, 'Ferretería Norte R1');
  });

  it('an authorized grantor provisions a manager with edit, work and team range together', async () => {
    for (const roleKey of MANAGER_SCOPES) {
      const granted = await command('grantor', 'GrantAdditionalRole', { memberId: m.candidate!.member.id, roleKey });
      assert.equal(granted.status, 201, `${roleKey}: ${JSON.stringify(granted.body)}`);
    }
    const team = await command('grantor', 'ChangeManager', {
      memberId: m.seller!.member.id,
      managerMemberId: m.candidate!.member.id,
    });
    assert.equal(team.status, 201, JSON.stringify(team.body));
    assert.deepEqual(await activeKeys('candidate'), [...MANAGER_SCOPES, 'sales_manager'].sort());

    // 22:20 §2: a role change never creates a persistent extra grant. Read-only
    // range is given only by an explicit GrantAdditionalRole.
    const keysBefore = await activeKeys('readCandidate');
    const asRole = await command('grantor', 'ChangeRole', {
      memberId: m.readCandidate!.member.id,
      roleKey: 'commercial.team.read',
    });
    assert.deepEqual([asRole.status, asRole.body], [400, { code: 'VALIDATION_FAILED' }]);
    assert.deepEqual(await activeKeys('readCandidate'), keysBefore, 'refused role change wrote nothing');
    const readRole = await command('grantor', 'GrantAdditionalRole', {
      memberId: m.readCandidate!.member.id,
      roleKey: 'commercial.team.read',
    });
    assert.equal(readRole.status, 201, JSON.stringify(readRole.body));
    const readTeam = await command('grantor', 'ChangeManager', {
      memberId: m.seller2!.member.id,
      managerMemberId: m.readCandidate!.member.id,
    });
    assert.equal(readTeam.status, 201);
    assert.deepEqual(await activeKeys('readCandidate'), [...keysBefore, 'commercial.team.read'].sort());
  });

  it('the provisioned manager edits and quotes the team customer over HTTP; ownership is unchanged', async () => {
    const party = await prisma().osParty.findUniqueOrThrow({ where: { id: state.partyId } });
    const edit = await command('candidate', 'UpdateParty', {
      partyId: state.partyId,
      displayName: 'Ferretería Norte SRL R1',
      expectedVersion: party.version,
    });
    assert.equal(edit.status, 201, JSON.stringify(edit.body));
    const quote = await command('candidate', 'CreateQuote', { partyId: state.partyId });
    assert.equal(quote.status, 201, JSON.stringify(quote.body));
    const quoteRow = await prisma().osQuote.findUniqueOrThrow({
      where: { id: String((quote.body.data as Record<string, unknown>).quoteId) },
    });
    assert.equal(quoteRow.ownerMemberId, m.seller!.member.id);
    const account = await prisma().osCommercialAccount.findFirstOrThrow({ where: { organizationId: org.id, partyId: state.partyId } });
    assert.equal(account.ownerMemberId, m.seller!.member.id);
  });

  it('the read-only manager stays read-only (403, no writes)', async () => {
    const party = await prisma().osParty.findUniqueOrThrow({ where: { id: state.readPartyId } });
    const quotesBefore = await prisma().osQuote.count({ where: { organizationId: org.id } });
    const edit = await command('readCandidate', 'UpdateParty', {
      partyId: state.readPartyId,
      displayName: 'x',
      expectedVersion: party.version,
    });
    assert.deepEqual([edit.status, edit.body], DENIED);
    const quote = await command('readCandidate', 'CreateQuote', { partyId: state.readPartyId });
    assert.deepEqual([quote.status, quote.body], DENIED);
    assert.equal((await prisma().osParty.findUniqueOrThrow({ where: { id: state.readPartyId } })).version, party.version);
    assert.equal(await prisma().osQuote.count({ where: { organizationId: org.id } }), quotesBefore);
  });

  it('ChangeManager cannot extend a manager over someone outside the grantor reach (403, no rows)', async () => {
    const before = await writes();
    for (const who of ['rrhh', 'teamGrantor']) {
      const reply = await command(who, 'ChangeManager', {
        memberId: m.seller2!.member.id,
        managerMemberId: m.candidate!.member.id,
      });
      assert.deepEqual([reply.status, reply.body], DENIED, who);
    }
    assert.deepEqual(await writes(), before);
    const party = await prisma().osParty.findUniqueOrThrow({ where: { id: state.readPartyId } });
    const edit = await command('candidate', 'UpdateParty', { partyId: state.readPartyId, displayName: 'x', expectedVersion: party.version });
    assert.notEqual(edit.status, 201, 'candidate still has no reach over seller2');
  });

  it('the provisioned manager cannot pass on what they were given without holding grant authority', async () => {
    const before = await writes();
    const reply = await command('candidate', 'GrantAdditionalRole', {
      memberId: m.seller2!.member.id,
      roleKey: 'commercial.customer.edit',
    });
    assert.deepEqual([reply.status, reply.body], DENIED);
    assert.deepEqual(await writes(), before);
  });
});
