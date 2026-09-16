/**
 * Staging-only additive grant: qa.access for the Carmen staging operator (REAL tenant).
 *
 * Does not touch SYNTH personas or REAL customer data. Idempotent role assignment.
 *
 * Required env: OS_DATABASE_URL, STAGING_FIXTURE_CONFIRM=1
 * Optional: STAGING_ADMIN_EMAIL (default carmen.staging@isalwa.demo)
 *
 * Run:
 *   STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database exec node --import tsx src/staging-qa-access-grant.ts
 */
import { randomUUID } from 'node:crypto';
import { QA_ACCESS_SCOPE } from '@isalwa/os-contracts';
import { getOsPrisma } from './client';
import {
  STAGING_DATABASE_NAME,
  STAGING_FIXTURE_CONFIRM_VALUE,
  assertStagingDatabaseName,
  assertMigrationCount,
  requireEnvFrom,
} from './staging-wave2-role-fixtures-guards';

const SYNTH_ORG = '01M2JKF77TXMJNDTKNCYNHH9G5';

function log(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

async function main(): Promise<void> {
  if (process.env.STAGING_FIXTURE_CONFIRM?.trim() !== STAGING_FIXTURE_CONFIRM_VALUE) {
    throw new Error('STAGING_FIXTURE_CONFIRM=1 required');
  }
  requireEnvFrom(process.env, 'OS_DATABASE_URL');
  const adminEmail =
    process.env.STAGING_ADMIN_EMAIL?.trim() || 'carmen.staging@isalwa.demo';

  const prisma = getOsPrisma();
  if (!prisma) throw new Error('OS_DATABASE_URL prisma unavailable');

  const dbRows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assertStagingDatabaseName(dbRows[0]?.name ?? '');

  const migRows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count FROM _prisma_migrations
  `;
  assertMigrationCount(Number(migRows[0]?.count ?? -1));

  const identity = await prisma.osAuthIdentity.findFirst({
    where: { email: { equals: adminEmail, mode: 'insensitive' }, status: 'active' },
    select: { personId: true },
  });
  if (!identity?.personId) {
    throw new Error(`STAGING_ADMIN_IDENTITY_NOT_FOUND:${adminEmail}`);
  }

  const member = await prisma.osOrganizationMember.findFirst({
    where: {
      personId: identity.personId,
      accessStatus: 'active',
      organizationId: { not: SYNTH_ORG },
    },
    orderBy: { employmentStartedAt: 'asc' },
    select: { id: true, organizationId: true },
  });
  if (!member) {
    throw new Error(`STAGING_ADMIN_MEMBER_NOT_FOUND:${adminEmail}:non_synth`);
  }

  const existing = await prisma.osRoleAssignment.findFirst({
    where: {
      organizationId: member.organizationId,
      memberId: member.id,
      roleKey: QA_ACCESS_SCOPE,
      endedAt: null,
    },
  });
  if (existing) {
    log(`QA_ACCESS_ALREADY_ACTIVE memberId=${member.id}`);
    return;
  }

  await prisma.osRoleAssignment.create({
    data: {
      id: randomUUID(),
      organizationId: member.organizationId,
      memberId: member.id,
      roleKey: QA_ACCESS_SCOPE,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    },
  });
  log(`QA_ACCESS_GRANTED memberId=${member.id} email=${adminEmail} database=${STAGING_DATABASE_NAME}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
