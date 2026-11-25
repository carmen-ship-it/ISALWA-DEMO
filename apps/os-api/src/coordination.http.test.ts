/**
 * Coordinación durable decisions — disposable Postgres HTTP.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Test } from '@nestjs/testing';
import { createId } from '@isalwa/ts-utils';
import { getOsPrisma } from '@isalwa/os-database';
import { COORDINATION_DECISION_CAPABILITY, COMMERCIAL_TEAM_READ_SCOPE } from '@isalwa/os-contracts';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';

const DB = process.env.OS_DATABASE_URL ?? '';
const RUN =
  DB.includes('disposable') ||
  DB.includes('auth_gate') ||
  DB.includes('localhost') ||
  DB.includes('127.0.0.1') ||
  DB.includes('/tmp');

describe('coordination decisions HTTP', { skip: !RUN }, () => {
  let baseUrl = '';
  let close: (() => Promise<void>) | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: any;

  before(async () => {
    if (!RUN) return;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
    await app.listen(0);
    const addr = app.getHttpServer().address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;
    store = app.get(OS_STORE);
    close = async () => {
      await app.close();
    };
  });

  after(async () => {
    if (close) await close();
  });

  async function seedSeat(orgId: string, label: string, roleKeys: string[]) {
    const seeded = await store.seedAdminMember(orgId, `${label}-${createId()}@coord.bo`, label, 'CO');
    const prisma = getOsPrisma()!;
    await prisma.osRoleAssignment.deleteMany({
      where: { organizationId: orgId, memberId: seeded.member.id, roleKey: 'people.admin' },
    });
    for (const roleKey of roleKeys) {
      await prisma.osRoleAssignment.create({
        data: {
          id: createId(),
          organizationId: orgId,
          memberId: seeded.member.id,
          roleKey,
          effectiveAt: new Date('2020-01-01'),
        },
      });
    }
    return {
      organizationId: orgId,
      memberId: seeded.member.id,
      personId: seeded.person.id,
      authIdentityId: seeded.auth.id,
    };
  }

  function headers(seat: {
    organizationId: string;
    memberId: string;
    personId: string;
    authIdentityId: string;
  }) {
    return {
      'content-type': 'application/json',
      'x-os-organization-id': seat.organizationId,
      'x-os-member-id': seat.memberId,
      'x-os-person-id': seat.personId,
      'x-os-auth-identity-id': seat.authIdentityId,
    };
  }

  it('records and resolves in Postgres; denies other scopes and foreign tenants', async () => {
    if (!RUN) return;
    const prisma = getOsPrisma()!;
    const orgA = await store.seedOrganization('Coord A', `coord-a-${createId().slice(-8)}`);
    const orgB = await store.seedOrganization('Coord B', `coord-b-${createId().slice(-8)}`);
    const orgAId = orgA.id as string;
    const orgBId = orgB.id as string;

    const coordinator = await seedSeat(orgAId, 'coord', [COORDINATION_DECISION_CAPABILITY]);
    const commercial = await seedSeat(orgAId, 'comm', [COMMERCIAL_TEAM_READ_SCOPE]);
    const foreign = await seedSeat(orgBId, 'foreign', [COORDINATION_DECISION_CAPABILITY]);

    const denied = await fetch(`${baseUrl}/v1/coordination/decisions`, {
      method: 'POST',
      headers: headers(commercial),
      body: JSON.stringify({ decision: 'No debe persistir', actorLabel: 'Comercial' }),
    });
    assert.equal(denied.status, 403);

    const created = await fetch(`${baseUrl}/v1/coordination/decisions`, {
      method: 'POST',
      headers: headers(coordinator),
      body: JSON.stringify({
        decision: 'Revisar abastecimiento cruzado',
        ownerLabel: 'Encargada de compras',
        dueAt: '2026-12-01',
        notes: 'Caso sintético',
        actorLabel: 'Coordinadora',
      }),
    });
    const createdText = await created.text();
    assert.ok(
      created.status === 200 || created.status === 201,
      `create status ${created.status} ${createdText}`,
    );
    const createdBody = JSON.parse(createdText);
    assert.equal(createdBody.liveWrite, 'PROVEN');
    assert.equal(createdBody.decision.decision, 'Revisar abastecimiento cruzado');
    assert.equal(createdBody.mutatedProduction, false);
    assert.equal(createdBody.mutatedPayment, false);

    const decisionId = createdBody.decision.id as string;
    const persisted = await prisma.osCoordinationDecision.findUnique({ where: { id: decisionId } });
    assert.ok(persisted);
    assert.equal(persisted!.organizationId, orgAId);
    assert.equal(persisted!.decision, 'Revisar abastecimiento cruzado');
    assert.equal(persisted!.kind, 'recorded');

    const list = await fetch(`${baseUrl}/v1/coordination/decisions`, {
      headers: headers(coordinator),
    });
    assert.equal(list.status, 200);
    const listBody = await list.json();
    assert.equal(listBody.liveWrite, 'PROVEN');
    assert.equal(
      listBody.decisions.some((row: { id: string }) => row.id === decisionId),
      true,
    );

    const foreignList = await fetch(`${baseUrl}/v1/coordination/decisions`, {
      headers: headers(foreign),
    });
    assert.equal(foreignList.status, 200);
    const foreignBody = await foreignList.json();
    assert.equal(
      foreignBody.decisions.some((row: { id: string }) => row.id === decisionId),
      false,
    );

    const resolved = await fetch(`${baseUrl}/v1/coordination/decisions/${decisionId}/resolve`, {
      method: 'POST',
      headers: headers(coordinator),
      body: JSON.stringify({
        decision: 'Cerrado con acuerdo de área',
        actorLabel: 'Coordinadora',
      }),
    });
    const resolvedText = await resolved.text();
    assert.ok(
      resolved.status === 200 || resolved.status === 201,
      `resolve status ${resolved.status} ${resolvedText}`,
    );
    const resolvedBody = JSON.parse(resolvedText);
    assert.equal(resolvedBody.decision.kind, 'resolved');
    assert.equal(resolvedBody.decision.resolvesDecisionId, decisionId);

    const after = await prisma.osCoordinationDecision.findMany({
      where: { organizationId: orgAId },
      orderBy: { occurredAt: 'asc' },
    });
    assert.equal(after.length >= 2, true);
    assert.equal(
      after.some((row) => row.kind === 'resolved' && row.resolvesDecisionId === decisionId),
      true,
    );
  });
});
