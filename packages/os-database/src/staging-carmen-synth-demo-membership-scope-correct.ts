/**
 * Staging-only: tighten Carmen SYNTH membership to owner-evaluation BUSINESS scopes.
 * Ends admin/bypass role assignments on SYNTH only. Does not touch REAL membership.
 *
 * Removes at minimum: people.admin, master_data.admin, qa.access
 * Never grants system.admin / integration.admin.
 *
 *   STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database exec node --import tsx src/staging-carmen-synth-demo-membership-scope-correct.ts
 */
import { getOsPrisma } from './client';
import {
  STAGING_DATABASE_NAME,
  STAGING_FIXTURE_CONFIRM_VALUE,
  assertStagingDatabaseName,
  assertMigrationCount,
  requireEnvFrom,
} from './staging-wave2-role-fixtures-guards';
import {
  OWNER_DEMO_SYNTH_FORBIDDEN_SCOPES,
  OWNER_DEMO_SYNTH_BUSINESS_SCOPES,
} from './staging-carmen-synth-demo-scopes';

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

  const synthMember = await prisma.osOrganizationMember.findFirst({
    where: {
      personId: identity.personId,
      organizationId: SYNTH_ORG,
      accessStatus: 'active',
    },
    select: { id: true },
  });
  if (!synthMember) throw new Error(`CARMEN_SYNTH_MEMBER_MISSING:${adminEmail}`);

  const beforeRows = await prisma.osRoleAssignment.findMany({
    where: { memberId: synthMember.id, organizationId: SYNTH_ORG, endedAt: null },
    select: { id: true, roleKey: true },
    orderBy: { roleKey: 'asc' },
  });
  const before = beforeRows.map((r) => r.roleKey).sort();
  log(`CARMEN_SYNTH_SCOPES_BEFORE count=${before.length} keys=${before.join(',')}`);

  const allowed = new Set<string>(OWNER_DEMO_SYNTH_BUSINESS_SCOPES);
  const forbidden = new Set<string>(OWNER_DEMO_SYNTH_FORBIDDEN_SCOPES);
  const now = new Date();
  const removed: string[] = [];

  for (const row of beforeRows) {
    const drop = forbidden.has(row.roleKey) || !allowed.has(row.roleKey);
    if (!drop) continue;
    await prisma.osRoleAssignment.update({
      where: { id: row.id },
      data: { endedAt: now },
    });
    removed.push(row.roleKey);
  }

  const afterRows = await prisma.osRoleAssignment.findMany({
    where: { memberId: synthMember.id, organizationId: SYNTH_ORG, endedAt: null },
    select: { roleKey: true },
    orderBy: { roleKey: 'asc' },
  });
  const after = afterRows.map((r) => r.roleKey).sort();

  log(`CARMEN_SYNTH_SCOPES_REMOVED count=${removed.length} keys=${removed.sort().join(',')}`);
  log(`CARMEN_SYNTH_SCOPES_AFTER count=${after.length} keys=${after.join(',')}`);
  log(
    JSON.stringify({
      ok: true,
      email: adminEmail,
      synthMemberId: synthMember.id,
      database: STAGING_DATABASE_NAME,
      REAL_MEMBERSHIP_CHANGED: 'NO',
      REAL_SEVEN_MUTATED: 'NO',
      PEOPLE_ADMIN_PRESENT: after.includes('people.admin') ? 'YES' : 'NO',
      MASTER_DATA_ADMIN_PRESENT: after.includes('master_data.admin') ? 'YES' : 'NO',
      QA_ACCESS_PRESENT: after.includes('qa.access') ? 'YES' : 'NO',
      SYSTEM_ADMIN_PRESENT: after.includes('system.admin') ? 'YES' : 'NO',
      before,
      after,
      removed: removed.sort(),
      added: [],
    }),
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
