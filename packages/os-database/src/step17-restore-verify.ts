/**
 * Step 17 — Post-restore verification against seed marker.
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { getOsPrisma } from './client';
import { PrismaOsWorkforceStore } from './prisma-workforce-store';

const markerPath = process.env.STEP17_MARKER_PATH ?? '.step17-evidence/seed-marker.json';

async function main() {
  const marker = JSON.parse(readFileSync(markerPath, 'utf8')) as {
    organizationId: string;
    partyId: string;
    counts: {
      businessEvents: number;
      outbox: number;
      auditLogs: number;
      parties: number;
    };
  };

  const prisma = getOsPrisma();
  if (!prisma) throw new Error('OS_DATABASE_URL required');

  const store = new PrismaOsWorkforceStore(prisma);

  const org = await prisma.osOrganization.findUnique({ where: { id: marker.organizationId } });
  assert.ok(org, 'organization restored');

  const party = await prisma.osParty.findUnique({ where: { id: marker.partyId } });
  assert.ok(party, 'party restored');
  assert.equal(party.organizationId, marker.organizationId);

  assert.equal(await store.countBusinessEvents(marker.organizationId), marker.counts.businessEvents);
  assert.equal(await store.countOutbox(marker.organizationId), marker.counts.outbox);
  assert.equal(await store.countAuditLogs(marker.organizationId), marker.counts.auditLogs);
  assert.equal(
    await prisma.osParty.count({ where: { organizationId: marker.organizationId } }),
    marker.counts.parties,
  );

  const idempotency = await prisma.osIdempotencyKey.count({
    where: { organizationId: marker.organizationId },
  });
  assert.ok(idempotency >= 0, 'idempotency table readable');

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      ok: true,
      organizationId: marker.organizationId,
      partyId: marker.partyId,
      verified: marker.counts,
    }),
  );
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
