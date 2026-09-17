/**
 * Staging-only: ensure Carmen has an active SYNTH membership so Demo can select
 * company context via x-os-organization-id (not QA Ver-como impersonation).
 *
 * Grants the full OWNER_DEMO_SYNTH_BUSINESS_SCOPES allowlist on SYNTH (not only
 * REAL∩allowlist) so Demo desks stay complete when REAL grants lag — e.g.
 * issue.manage for Resolver incidencia. Still never copies forbidden admin scopes.
 * Never mutates REAL customer truth / REAL_SEVEN.
 *
 *   STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database exec node --import tsx src/staging-carmen-synth-demo-membership.ts
 */
import { randomUUID } from 'node:crypto';
import { getOsPrisma } from './client';
import {
  STAGING_DATABASE_NAME,
  STAGING_FIXTURE_CONFIRM_VALUE,
  assertStagingDatabaseName,
  assertMigrationCount,
  requireEnvFrom,
} from './staging-wave2-role-fixtures-guards';
import { OWNER_DEMO_SYNTH_BUSINESS_SCOPES } from './staging-carmen-synth-demo-scopes';

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
  const prisma = getOsPrisma();
  if (!prisma) throw new Error('OS_DATABASE_URL prisma unavailable');

  const dbRows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assertStagingDatabaseName(dbRows[0]?.name ?? '');
  const migRows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count FROM _prisma_migrations
  `;
  assertMigrationCount(Number(migRows[0]?.count ?? -1));

  const adminEmail =
    process.env.STAGING_ADMIN_EMAIL?.trim() || 'carmen.staging@isalwa.demo';

  const identity = await prisma.osAuthIdentity.findFirst({
    where: { email: { equals: adminEmail, mode: 'insensitive' }, status: 'active' },
    select: { personId: true, email: true },
  });
  if (!identity?.personId) throw new Error(`STAGING_ADMIN_IDENTITY_NOT_FOUND:${adminEmail}`);

  const realMember = await prisma.osOrganizationMember.findFirst({
    where: {
      personId: identity.personId,
      accessStatus: 'active',
      organizationId: { not: SYNTH_ORG },
    },
    orderBy: { employmentStartedAt: 'asc' },
    select: { id: true, organizationId: true },
  });
  if (!realMember) throw new Error(`STAGING_ADMIN_MEMBER_NOT_FOUND:${adminEmail}:non_synth`);

  // Owner-eval SYNTH gets the full business allowlist (still never forbidden admin keys).
  const scopeKeys = [...OWNER_DEMO_SYNTH_BUSINESS_SCOPES];
  log(`CARMEN_SYNTH_SOURCE_SCOPES count=${scopeKeys.length} keys=${scopeKeys.join(',')}`);
  log(`CARMEN_REAL_MEMBER_PRESENT org=${realMember.organizationId} id=${realMember.id}`);

  let synthMember = await prisma.osOrganizationMember.findFirst({
    where: {
      personId: identity.personId,
      organizationId: SYNTH_ORG,
      accessStatus: 'active',
    },
    select: { id: true },
  });

  if (!synthMember) {
    const id = randomUUID();
    await prisma.osOrganizationMember.create({
      data: {
        id,
        organizationId: SYNTH_ORG,
        personId: identity.personId,
        employmentStatus: 'active',
        accessStatus: 'active',
        employmentStartedAt: new Date('2020-01-01T00:00:00.000Z'),
      },
    });
    synthMember = { id };
    log(`CARMEN_SYNTH_MEMBER_CREATED id=${id}`);
  } else {
    log(`CARMEN_SYNTH_MEMBER_REUSED id=${synthMember.id}`);
  }

  const existing = await prisma.osRoleAssignment.findMany({
    where: { memberId: synthMember.id, organizationId: SYNTH_ORG, endedAt: null },
    select: { roleKey: true },
  });
  const have = new Set(existing.map((r) => r.roleKey));
  const missing = scopeKeys.filter((k) => !have.has(k));
  for (const roleKey of missing) {
    await prisma.osRoleAssignment.create({
      data: {
        id: randomUUID(),
        organizationId: SYNTH_ORG,
        memberId: synthMember.id,
        roleKey,
        effectiveAt: new Date('2020-01-01T00:00:00.000Z'),
        endedAt: null,
      },
    });
  }
  log(`CARMEN_SYNTH_SCOPES_GRANTED count=${missing.length}`);
  log(
    `CARMEN_SYNTH_DEMO_MEMBERSHIP_DONE email=${adminEmail} synthMember=${synthMember.id} database=${STAGING_DATABASE_NAME} REAL_SEVEN_MUTATED=NO PEOPLE_ADMIN=NO QA_ACCESS=NO MASTER_DATA_ADMIN=NO`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
