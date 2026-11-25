/**
 * Live disposable-Postgres proof for the elapsed notice clock:
 * 48h waiting-customer, 60m due-soon, 15m unclaimed, restart catch-up,
 * idempotent second tick, no invented manager recipient.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ElapsedNoticeClock } from '@isalwa/os-query';
import { createId } from '@isalwa/ts-utils';
import { getOsPrisma } from '@isalwa/os-database';
import { AppModule } from './app.module';
import { OS_STORE } from './os-store.module';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { createPrismaElapsedNoticeStore } from './elapsed-notice-clock.prisma';

const DB = process.env.OS_DATABASE_URL ?? '';
const RUN =
  DB.includes('disposable') ||
  DB.includes('auth_gate') ||
  DB.includes('localhost') ||
  DB.includes('/tmp');

const AS_OF = new Date('2026-11-25T16:00:00.000Z');

describe('elapsed notice clock live (disposable Postgres)', { skip: !RUN }, () => {
  let app: INestApplication;
  let store: OsWorkforceStore;
  const prisma = () => getOsPrisma()!;
  let orgId = '';
  let ownerId = '';
  let managerId = '';
  let partyId = '';
  let commitmentId = '';
  let waitingId = '';
  let unclaimedId = '';
  let orphanUnclaimedId = '';

  before(async () => {
    if (!RUN) return;
    process.env.OS_OUTBOX_WORKER = '0';
    process.env.OS_PROJECTION_WORKER = '0';
    process.env.OS_ELAPSED_NOTICE_CLOCK = '0';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    store = moduleRef.get(OS_STORE);

    const org = await store.seedOrganization('Elapsed Live Org', `elapsed-${createId()}`);
    orgId = org.id;
    const owner = await store.seedAdminMember(orgId, `owner-${createId()}@elapsed.bo`, 'owner', 'ELAPSED');
    const manager = await store.seedAdminMember(orgId, `mgr-${createId()}@elapsed.bo`, 'manager', 'ELAPSED');
    ownerId = owner.member.id;
    managerId = manager.member.id;
    await prisma().osRoleAssignment.deleteMany({
      where: { organizationId: orgId, roleKey: 'people.admin' },
    });
    await prisma().osManagerAssignment.create({
      data: {
        id: createId(),
        organizationId: orgId,
        memberId: ownerId,
        managerMemberId: managerId,
        effectiveAt: new Date('2020-01-01'),
      },
    });

    partyId = createId();
    await prisma().osParty.create({
      data: {
        id: partyId,
        organizationId: orgId,
        partyKind: 'organization',
        displayName: 'Cliente Elapsed',
      },
    });

    commitmentId = createId();
    await prisma().osCommitment.create({
      data: {
        id: commitmentId,
        organizationId: orgId,
        ownerMemberId: ownerId,
        partyId,
        text: 'Llamar al cliente en 60 minutos',
        lifecycle: 'open',
        origin: 'employee_entered',
        createdByMemberId: ownerId,
        dueAt: new Date(AS_OF.getTime() + 30 * 60 * 1000),
      },
    });

    waitingId = createId();
    await prisma().osCustomerConversation.create({
      data: {
        id: waitingId,
        organizationId: orgId,
        customerId: partyId,
        customerLabel: 'Cliente Elapsed',
        channel: 'whatsapp',
        assignedMemberId: ownerId,
        assignedLabel: 'owner ELAPSED',
        assignedAt: new Date(AS_OF.getTime() - 48 * 60 * 60 * 1000),
        attentionState: 'waiting_customer',
        attentionStateChangedAt: new Date(AS_OF.getTime() - 48 * 60 * 60 * 1000),
        summary: 'Esperando respuesta del cliente (simulado)',
        occurredAt: new Date(AS_OF.getTime() - 49 * 60 * 60 * 1000),
        enteredByMemberId: ownerId,
        enteredByLabel: 'owner ELAPSED',
      },
    });

    unclaimedId = createId();
    await prisma().osCustomerConversation.create({
      data: {
        id: unclaimedId,
        organizationId: orgId,
        customerId: partyId,
        customerLabel: 'Cliente Elapsed',
        channel: 'whatsapp',
        assignedMemberId: null,
        assignedLabel: null,
        assignedAt: null,
        attentionState: 'new',
        attentionStateChangedAt: new Date(AS_OF.getTime() - 16 * 60 * 1000),
        summary: 'Conversación sin tomar',
        occurredAt: new Date(AS_OF.getTime() - 20 * 60 * 1000),
        enteredByMemberId: ownerId,
        enteredByLabel: 'owner ELAPSED',
      },
    });

    orphanUnclaimedId = createId();
    const orphanOrg = await store.seedOrganization('Elapsed Orphan Org', `orphan-${createId()}`);
    const orphanParty = createId();
    await prisma().osParty.create({
      data: {
        id: orphanParty,
        organizationId: orphanOrg.id,
        partyKind: 'organization',
        displayName: 'Sin gerente',
      },
    });
    await prisma().osCustomerConversation.create({
      data: {
        id: orphanUnclaimedId,
        organizationId: orphanOrg.id,
        customerId: orphanParty,
        customerLabel: 'Sin gerente',
        channel: 'whatsapp',
        assignedMemberId: null,
        attentionState: 'new',
        attentionStateChangedAt: new Date(AS_OF.getTime() - 20 * 60 * 1000),
        summary: 'Sin gerente asignado',
        occurredAt: new Date(AS_OF.getTime() - 25 * 60 * 1000),
        enteredByMemberId: ownerId,
        enteredByLabel: 'owner ELAPSED',
      },
    });
  });

  after(async () => {
    if (app) await app.close();
  });

  it('inserts 48h / 60m / 15m notices, is idempotent after restart, and invents no recipient', async () => {
    const clockStore = createPrismaElapsedNoticeStore();
    const firstClock = new ElapsedNoticeClock(clockStore);
    const first = await firstClock.runOnce(AS_OF);
    assert.ok(first.inserted >= 3, `expected >=3 inserts, got ${first.inserted}`);

    const rows = await prisma().osInternalNotification.findMany({
      where: { organizationId: orgId },
      select: { kind: true, recipientMemberId: true, dedupKey: true, sourceRecordId: true },
    });
    const kinds = new Set(rows.map((r) => r.kind));
    assert.equal(kinds.has('commitment_due_soon'), true);
    assert.equal(kinds.has('follow_up_elapsed'), true);
    assert.equal(kinds.has('conversation_unclaimed'), true);
    assert.ok(rows.some((r) => r.sourceRecordId === commitmentId && r.recipientMemberId === ownerId));
    assert.ok(rows.some((r) => r.sourceRecordId === waitingId && r.recipientMemberId === ownerId));
    assert.ok(rows.some((r) => r.sourceRecordId === unclaimedId && r.recipientMemberId === managerId));

    const orphanRows = await prisma().osInternalNotification.findMany({
      where: { sourceRecordId: orphanUnclaimedId },
    });
    assert.equal(orphanRows.length, 0, 'must not invent a manager recipient');

    // Restart catch-up: new clock instance, same durable store — second tick inserts 0.
    const restarted = new ElapsedNoticeClock(clockStore);
    const second = await restarted.runOnce(AS_OF);
    assert.equal(second.inserted, 0);
    const after = await prisma().osInternalNotification.count({ where: { organizationId: orgId } });
    assert.equal(after, rows.length);
  });
});
