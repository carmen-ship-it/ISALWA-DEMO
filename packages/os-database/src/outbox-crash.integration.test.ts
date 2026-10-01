import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  OsOutboxWorker,
  buildAuditEntry,
  buildBusinessEvent,
  buildOutboxForEvent,
  type OsOutboxConsumerPort,
} from '@isalwa/os-events';
import { getOsPrisma, PrismaOsOutboxStore, PrismaOsWorkforceStore } from './index';
import { isConsumerDedupViolation } from './prisma-outbox-store';

const describePrisma = process.env.OS_DATABASE_URL ? describe : describe.skip;

/**
 * D1 reproof against real Postgres. A process that dies after it started
 * delivering must leave the message retryable and the consumer applicable,
 * without any cleanup code running (SIGKILL: no catch, no finally).
 */
describePrisma('outbox crash recovery (real Postgres, SIGKILL)', () => {
  const prisma = getOsPrisma();
  if (!prisma) throw new Error('OS_DATABASE_URL required');
  const workforceStore = new PrismaOsWorkforceStore(prisma);
  const store = new PrismaOsOutboxStore(prisma);
  const scratch = mkdtempSync(join(tmpdir(), 'outbox-crash-'));

  before(async () => {
    await workforceStore.truncateAll();
  });

  after(async () => {
    await workforceStore.truncateAll();
    rmSync(scratch, { recursive: true, force: true });
  });

  async function seedMessage(orgId: string, suffix: string) {
    const event = buildBusinessEvent({
      organizationId: orgId,
      eventType: 'member.invited',
      occurredAt: new Date(),
      actorMemberId: null,
      primaryEntityType: 'organization_member',
      primaryEntityId: `mem-${suffix}`,
      correlationId: `corr-${suffix}`,
    });
    const outbox = buildOutboxForEvent(event);
    const audit = buildAuditEntry(
      orgId,
      null,
      'member.invited',
      'organization_member',
      `mem-${suffix}`,
      event.correlationId,
    );
    await workforceStore.appendEventAndAudit(event, outbox, audit);
    return { event, outbox };
  }

  async function dedupRows(orgId: string, consumerKey: string) {
    return prisma!.osOutboxConsumerDedup.findMany({ where: { organizationId: orgId, consumerKey } });
  }

  /** Spawn the child, wait until it is inside deliver(), then SIGKILL it. */
  async function killChildMidDelivery(
    consumerKey: string,
    mode: 'before-write' | 'after-write',
    effectDir: string,
  ): Promise<void> {
    const child = spawn(
      process.execPath,
      [...process.execArgv, join(__dirname, 'outbox-crash-child.ts'), consumerKey, mode, effectDir],
      { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += String(d)));
    const exited = new Promise<string | null>((resolve) =>
      child.once('exit', (code, signal) => resolve(signal ?? `exit:${code}`)),
    );
    const ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`child never reached deliver(): ${stderr}`)), 30_000);
      child.stdout.on('data', (d) => {
        if (String(d).includes('READY')) {
          clearTimeout(timer);
          resolve();
        }
      });
      void exited.then((how) => {
        clearTimeout(timer);
        reject(new Error(`child exited before deliver() (${how}): ${stderr}`));
      });
    });
    try {
      await ready;
    } catch (err) {
      child.kill('SIGKILL');
      throw err;
    }
    child.kill('SIGKILL');
    assert.equal(await exited, 'SIGKILL');
  }

  /** The lease on an in-flight message expires; a surviving worker may claim it again. */
  async function expireLease(outboxId: string) {
    await prisma!.osOutboxMessage.update({
      where: { id: outboxId },
      data: { nextAttemptAt: new Date(Date.now() - 1000) },
    });
  }

  function durableConsumer(consumerKey: string, effectDir: string, attempts: { n: number }) {
    const consumer: OsOutboxConsumerPort = {
      consumerKey,
      async deliver(envelope) {
        attempts.n += 1;
        mkdirSync(effectDir, { recursive: true });
        // Keyed by event id: re-applying the same event rewrites the same effect.
        writeFileSync(join(effectDir, envelope.id), 'applied');
      },
    };
    return consumer;
  }

  it('SIGKILL mid-delivery before any write: no completion row, message stays leased, restart applies it', async () => {
    const org = await workforceStore.seedOrganization('Crash A', `crash-a-${Date.now()}`);
    const { event, outbox } = await seedMessage(org.id, 'a');
    const consumerKey = `crash.a.${Date.now()}`;
    const effectDir = join(scratch, 'a');

    await killChildMidDelivery(consumerKey, 'before-write', effectDir);

    assert.deepEqual(await dedupRows(org.id, consumerKey), [], 'nothing recorded as delivered');
    assert.equal(existsSync(join(effectDir, event.id)), false);
    const stranded = await store.getOutboxMessage(outbox.id);
    assert.equal(stranded?.status, 'pending', 'never published');
    assert.ok(stranded?.nextAttemptAt && stranded.nextAttemptAt.getTime() > Date.now(), 'leased');

    // Lease still held: another worker must not steal an in-flight message.
    const early = await new OsOutboxWorker(store, [durableConsumer(consumerKey, effectDir, { n: 0 })]).runOnce();
    assert.equal(early.claimed, 0);

    await expireLease(outbox.id);
    const attempts = { n: 0 };
    const result = await new OsOutboxWorker(store, [durableConsumer(consumerKey, effectDir, attempts)]).runOnce();

    assert.equal(result.published, 1);
    assert.equal(result.duplicates, 0, 'a dead worker must not leave a claim that skips the consumer');
    assert.equal(attempts.n, 1);
    assert.equal(existsSync(join(effectDir, event.id)), true, 'the consumer applied');
    assert.equal((await dedupRows(org.id, consumerKey)).length, 1);
    assert.equal((await store.getOutboxMessage(outbox.id))?.status, 'published');
  });

  it('SIGKILL after the consumer wrote but before completion was recorded: re-delivered, effect still single', async () => {
    const org = await workforceStore.seedOrganization('Crash B', `crash-b-${Date.now()}`);
    const { event, outbox } = await seedMessage(org.id, 'b');
    const consumerKey = `crash.b.${Date.now()}`;
    const effectDir = join(scratch, 'b');

    await killChildMidDelivery(consumerKey, 'after-write', effectDir);

    assert.equal(existsSync(join(effectDir, event.id)), true, 'the effect was durable before death');
    assert.deepEqual(await dedupRows(org.id, consumerKey), [], 'completion was never recorded');
    assert.equal((await store.getOutboxMessage(outbox.id))?.status, 'pending');

    await expireLease(outbox.id);
    const attempts = { n: 0 };
    const result = await new OsOutboxWorker(store, [durableConsumer(consumerKey, effectDir, attempts)]).runOnce();

    assert.equal(result.published, 1);
    assert.equal(attempts.n, 1, 'at-least-once: the event is delivered again after the crash');
    assert.deepEqual(readdirSync(effectDir), [event.id], 'idempotent effect: one entry for the event');
    assert.equal((await dedupRows(org.id, consumerKey)).length, 1);
  });

  it('a recorded completion is honoured and is not re-delivered', async () => {
    const org = await workforceStore.seedOrganization('Crash C', `crash-c-${Date.now()}`);
    const { event, outbox } = await seedMessage(org.id, 'c');
    const consumerKey = `crash.c.${Date.now()}`;

    // Completion committed, then the worker died before markPublished.
    assert.equal(await store.hasConsumerDelivery(org.id, consumerKey, event.id), false);
    assert.equal(await store.tryRecordConsumerDelivery(org.id, consumerKey, event.id), true);
    assert.equal(await store.hasConsumerDelivery(org.id, consumerKey, event.id), true);

    const attempts = { n: 0 };
    const result = await new OsOutboxWorker(store, [
      durableConsumer(consumerKey, join(scratch, 'c'), attempts),
    ]).runOnce();
    assert.equal(result.published, 1);
    assert.equal(result.duplicates, 1);
    assert.equal(attempts.n, 0);
    assert.equal((await store.getOutboxMessage(outbox.id))?.status, 'published');
  });

  it('classifies real Postgres unique violations: only the dedup key is a duplicate', async () => {
    const org = await workforceStore.seedOrganization('Crash D', `crash-d-${Date.now()}`);
    const consumerKey = `crash.d.${Date.now()}`;

    // Real dedup violation.
    assert.equal(await store.tryRecordConsumerDelivery(org.id, consumerKey, 'evt-1'), true);
    assert.equal(await store.tryRecordConsumerDelivery(org.id, consumerKey, 'evt-1'), false);
    let dedupErr: unknown;
    try {
      await prisma!.osOutboxConsumerDedup.create({
        data: { organizationId: org.id, consumerKey, eventId: 'evt-1' },
      });
    } catch (err) {
      dedupErr = err;
    }
    assert.equal(isConsumerDedupViolation(dedupErr), true);

    // Real P2002 on a different model/target.
    const idem = {
      organizationId: org.id,
      key: 'same-key',
      commandName: 'cmd',
      resultJson: {},
      expiresAt: new Date(Date.now() + 60_000),
    };
    await store.saveIdempotency(idem);
    let otherErr: unknown;
    try {
      await store.saveIdempotency(idem);
    } catch (err) {
      otherErr = err;
    }
    assert.equal((otherErr as { code?: string } | undefined)?.code, 'P2002');
    assert.equal(isConsumerDedupViolation(otherErr), false);
  });
});
