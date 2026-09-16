/**
 * Staging-only additive grant: delivery.record on SYNTH wave2 Coordinación persona.
 *
 * Wave2 fixtures intentionally leave delivery.record unassigned. Hosted BV of
 * Nota/Entrega needs an evaluation actor with that business scope — not
 * people.admin, not commercial-read broadening, not inventing a company job title.
 *
 * Target: w2.coordinacion@isalwa.demo on SYNTH org 01M2JKF77TXMJNDTKNCYNHH9G5 only.
 * Idempotent OsRoleAssignment insert (endedAt null).
 *
 * Required: OS_DATABASE_URL, STAGING_FIXTURE_CONFIRM=1
 *
 * Run:
 *   STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database exec node --import tsx src/staging-synth-delivery-record-grant.ts
 */
import { randomUUID } from 'node:crypto';
import { DELIVERY_RECORD_SCOPE } from '@isalwa/os-contracts';
import { getOsPrisma } from './client';
import {
  STAGING_DATABASE_NAME,
  STAGING_FIXTURE_CONFIRM_VALUE,
  assertStagingDatabaseName,
  assertMigrationCount,
  requireEnvFrom,
} from './staging-wave2-role-fixtures-guards';

const SYNTH_ORG = '01M2JKF77TXMJNDTKNCYNHH9G5';
const COORD_EMAIL = 'w2.coordinacion@isalwa.demo';

function log(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

async function main(): Promise<void> {
  if (process.env.STAGING_FIXTURE_CONFIRM?.trim() !== STAGING_FIXTURE_CONFIRM_VALUE) {
    throw new Error('STAGING_FIXTURE_CONFIRM=1 required');
  }
  if (!process.env.OS_DATABASE_URL?.trim()) {
    const { readFileSync, existsSync } = await import('node:fs');
    const { homedir } = await import('node:os');
    const { join } = await import('node:path');
    const secretPath = join(homedir(), '.isalwa-secrets', 'isalwa-os-staging.external-database-url');
    if (!existsSync(secretPath)) {
      throw new Error('OS_DATABASE_URL missing and secret file absent');
    }
    process.env.OS_DATABASE_URL = readFileSync(secretPath, 'utf8').trim();
  }
  requireEnvFrom(process.env, 'OS_DATABASE_URL');

  const prisma = getOsPrisma();
  if (!prisma) throw new Error('OS_DATABASE_URL prisma unavailable');

  const dbRows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assertStagingDatabaseName(dbRows[0]?.name ?? '');

  const migRows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count FROM _prisma_migrations
  `;
  assertMigrationCount(Number(migRows[0]?.count ?? -1));

  const identity = await prisma.osAuthIdentity.findFirst({
    where: { email: { equals: COORD_EMAIL, mode: 'insensitive' }, status: 'active' },
    select: { personId: true },
  });
  if (!identity?.personId) {
    throw new Error(`SYNTH_DELIVERY_IDENTITY_NOT_FOUND:${COORD_EMAIL}`);
  }

  const member = await prisma.osOrganizationMember.findFirst({
    where: {
      personId: identity.personId,
      accessStatus: 'active',
      organizationId: SYNTH_ORG,
    },
    select: { id: true, organizationId: true },
  });
  if (!member) {
    throw new Error(`SYNTH_DELIVERY_MEMBER_NOT_FOUND:${COORD_EMAIL}:${SYNTH_ORG}`);
  }

  const active = await prisma.osRoleAssignment.findMany({
    where: {
      organizationId: member.organizationId,
      memberId: member.id,
      endedAt: null,
    },
    select: { roleKey: true },
  });
  const before = [...new Set(active.map((r) => r.roleKey))].sort();
  log(`SYNTH_DELIVERY_BEFORE memberId=${member.id} org=${member.organizationId} scopes=${before.join(',')}`);

  if (before.includes(DELIVERY_RECORD_SCOPE)) {
    log(`SYNTH_DELIVERY_ALREADY ${DELIVERY_RECORD_SCOPE}`);
    log(`SYNTH_DELIVERY_DONE email=${COORD_EMAIL} database=${STAGING_DATABASE_NAME} granted=NO`);
    return;
  }

  await prisma.osRoleAssignment.create({
    data: {
      id: randomUUID(),
      organizationId: member.organizationId,
      memberId: member.id,
      roleKey: DELIVERY_RECORD_SCOPE,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    },
  });

  log(`SYNTH_DELIVERY_GRANTED ${DELIVERY_RECORD_SCOPE}`);
  log(
    `SYNTH_DELIVERY_DONE email=${COORD_EMAIL} org=${SYNTH_ORG} database=${STAGING_DATABASE_NAME} granted=YES system_admin=NO people_admin=NO`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
