/**
 * Child process for outbox-crash.integration.test.ts. It claims one outbox
 * message, applies a durable effect (optionally), announces READY and then hangs
 * so the parent can SIGKILL it. No finally block, catch path or signal handler
 * can run: this is what a hard process death looks like.
 *
 * argv: <consumerKey> <before-write|after-write> <effectDir>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OsOutboxWorker, type OsOutboxConsumerPort } from '@isalwa/os-events';
import { getOsPrisma, PrismaOsOutboxStore } from './index';

const [consumerKey, mode, effectDir] = process.argv.slice(2);
if (!consumerKey || !effectDir || (mode !== 'before-write' && mode !== 'after-write')) {
  throw new Error('usage: outbox-crash-child <consumerKey> <before-write|after-write> <effectDir>');
}

const prisma = getOsPrisma();
if (!prisma) throw new Error('OS_DATABASE_URL required');

const consumer: OsOutboxConsumerPort = {
  consumerKey,
  async deliver(envelope) {
    mkdirSync(effectDir, { recursive: true });
    if (mode === 'after-write') {
      writeFileSync(join(effectDir, envelope.id), 'applied');
    }
    process.stdout.write('READY\n');
    // Stay inside deliver() until SIGKILL. A bare Promise does not keep Node
    // alive, and returning from deliver() would record completion before death.
    await new Promise<never>(() => {
      setInterval(() => {}, 60_000);
    });
  },
};

void new OsOutboxWorker(new PrismaOsOutboxStore(prisma), [consumer]).runOnce().catch((err) => {
  process.stderr.write(`${String(err)}\n`);
  process.exit(1);
});
