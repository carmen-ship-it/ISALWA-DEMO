/**
 * Staging-only additive grant: Carmen owner-evaluation BUSINESS scopes (REAL tenant).
 *
 * Temporary V1 review pattern: Isa/Álvaro evaluate via Carmen's login.
 * Grants explicit business desk scopes only — never system.admin / integration.admin
 * as a shortcut for ordinary business permissions.
 *
 * Does not create Isa/Álvaro accounts. Does not mutate REAL customer truth.
 * Idempotent OsRoleAssignment inserts (endedAt null).
 *
 * Required env: OS_DATABASE_URL, STAGING_FIXTURE_CONFIRM=1
 * Optional: STAGING_ADMIN_EMAIL (default carmen.staging@isalwa.demo)
 *
 * Run:
 *   STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database exec node --import tsx src/staging-carmen-owner-evaluation-grant.ts
 */
import { randomUUID } from 'node:crypto';
import {
  COMMERCIAL_ACCOUNT_REASSIGN_SCOPE,
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  COMMERCIAL_ORDER_CONVERT_SCOPE,
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_PRICE_APPROVE_SCOPE,
  COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  COORDINATION_DECISION_CAPABILITY,
  DELIVERY_RECORD_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  ISSUE_MANAGE_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
  WAREHOUSE_EXIT_RECORD_SCOPE,
  WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
} from '@isalwa/os-contracts';
import { getOsPrisma } from './client';
import {
  CARMEN_OWNER_EVALUATION_BUSINESS_SCOPES,
  assertCarmenOwnerEvaluationGrantListSafe,
} from './staging-carmen-owner-evaluation-grant-spec';
import {
  STAGING_DATABASE_NAME,
  STAGING_FIXTURE_CONFIRM_VALUE,
  assertStagingDatabaseName,
  assertMigrationCount,
  requireEnvFrom,
} from './staging-wave2-role-fixtures-guards';

const SYNTH_ORG = '01M2JKF77TXMJNDTKNCYNHH9G5';

/** Re-export for callers/tests that import the run module path. */
export {
  CARMEN_OWNER_EVALUATION_BUSINESS_SCOPES,
  assertCarmenOwnerEvaluationGrantListSafe,
} from './staging-carmen-owner-evaluation-grant-spec';

function log(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

/** Compile-time / runtime check that the grant list matches the frozen export. */
const EXPECTED = [
  MANAGEMENT_ORG_READ_SCOPE,
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
  COMMERCIAL_ORDER_CONVERT_SCOPE,
  COMMERCIAL_ACCOUNT_REASSIGN_SCOPE,
  COMMERCIAL_PRICE_APPROVE_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
  WAREHOUSE_EXIT_RECORD_SCOPE,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
  COORDINATION_DECISION_CAPABILITY,
  DELIVERY_RECORD_SCOPE,
  ISSUE_MANAGE_SCOPE,
] as const;

async function main(): Promise<void> {
  if (process.env.STAGING_FIXTURE_CONFIRM?.trim() !== STAGING_FIXTURE_CONFIRM_VALUE) {
    throw new Error('STAGING_FIXTURE_CONFIRM=1 required');
  }
  requireEnvFrom(process.env, 'OS_DATABASE_URL');
  assertCarmenOwnerEvaluationGrantListSafe(CARMEN_OWNER_EVALUATION_BUSINESS_SCOPES);
  if (JSON.stringify([...CARMEN_OWNER_EVALUATION_BUSINESS_SCOPES]) !== JSON.stringify([...EXPECTED])) {
    throw new Error('OWNER_EVAL_SCOPE_LIST_DRIFT');
  }

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

  const active = await prisma.osRoleAssignment.findMany({
    where: {
      organizationId: member.organizationId,
      memberId: member.id,
      endedAt: null,
    },
    select: { roleKey: true },
  });
  const before = [...new Set(active.map((r) => r.roleKey))].sort();
  log(`OWNER_EVAL_BEFORE memberId=${member.id} org=${member.organizationId} scopes=${before.join(',')}`);

  const missing = CARMEN_OWNER_EVALUATION_BUSINESS_SCOPES.filter((s) => !before.includes(s));
  const already = CARMEN_OWNER_EVALUATION_BUSINESS_SCOPES.filter((s) => before.includes(s));
  log(`OWNER_EVAL_MISSING count=${missing.length} ${missing.join(',') || '(none)'}`);
  log(`OWNER_EVAL_ALREADY count=${already.length} ${already.join(',') || '(none)'}`);

  const granted: string[] = [];
  for (const roleKey of missing) {
    await prisma.osRoleAssignment.create({
      data: {
        id: randomUUID(),
        organizationId: member.organizationId,
        memberId: member.id,
        roleKey,
        effectiveAt: new Date('2020-01-01'),
        endedAt: null,
      },
    });
    granted.push(roleKey);
  }

  const afterRows = await prisma.osRoleAssignment.findMany({
    where: {
      organizationId: member.organizationId,
      memberId: member.id,
      endedAt: null,
    },
    select: { roleKey: true },
  });
  const after = [...new Set(afterRows.map((r) => r.roleKey))].sort();
  log(`OWNER_EVAL_GRANTED count=${granted.length} ${granted.join(',') || '(none)'}`);
  log(`OWNER_EVAL_AFTER scopes=${after.join(',')}`);
  log(
    `OWNER_EVAL_DONE email=${adminEmail} database=${STAGING_DATABASE_NAME} finance=${after.includes(FINANCE_OPERATIONAL_RECORD_SCOPE) ? 'YES' : 'NO'} system_admin=${after.includes('system.admin') ? 'YES' : 'NO'}`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
