/**
 * Materialize the permanent V1 Coordinación assignment of delivery.record
 * on the existing SYNTH Wave 2 persona. This is not a separate Entregas role
 * and not a one-off scope outside the planned map.
 *
 * Target: w2.coordinacion@isalwa.demo on SYNTH org 01M2JKF77TXMJNDTKNCYNHH9G5 only.
 * Idempotent. Grants only delivery.record. Refuses any other grant or revocation.
 *
 * Dry run (no role write):
 *   STAGING_FIXTURE_CONFIRM=1 STAGING_FIXTURE_DRY_RUN=1 corepack pnpm --filter @isalwa/os-database exec node --import tsx src/staging-synth-delivery-record-grant.ts
 *
 * Apply:
 *   STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database exec node --import tsx src/staging-synth-delivery-record-grant.ts
 */
import { randomUUID } from 'node:crypto';
import { DELIVERY_RECORD_SCOPE } from '@isalwa/os-contracts';
import { getOsPrisma } from './client';
import { planCoordinacionDeliveryRecordMaterialization } from './staging-wave2-role-fixtures-lib';
import {
  STAGING_DATABASE_NAME,
  STAGING_FIXTURE_CONFIRM_VALUE,
  WAVE2_ROLE_FIXTURE_ORG_LEGAL_NAME,
  assertStagingDatabaseName,
  assertStagingDatabaseUrl,
  assertMigrationCount,
  plannedCapabilitiesFor,
  requireEnvFrom,
} from './staging-wave2-role-fixtures-guards';

const SYNTH_ORG = '01M2JKF77TXMJNDTKNCYNHH9G5';
const COORD_EMAIL = 'w2.coordinacion@isalwa.demo';
const BOUNDARY_EMAILS = ['w2.almacen@isalwa.demo', 'w2.asesor@isalwa.demo'] as const;

function log(line: string): void {
  const safe = line
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[DATABASE_URL_REDACTED]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]');
  // eslint-disable-next-line no-console
  console.log(safe);
}

async function activeRoleKeys(
  prisma: NonNullable<ReturnType<typeof getOsPrisma>>,
  email: string,
): Promise<{ memberId: string; organizationId: string; keys: string[] }> {
  const identity = await prisma.osAuthIdentity.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, status: 'active' },
    select: { personId: true },
  });
  if (!identity?.personId) {
    throw new Error(`SYNTH_DELIVERY_IDENTITY_NOT_FOUND:${email}`);
  }
  const member = await prisma.osOrganizationMember.findFirst({
    where: {
      personId: identity.personId,
      accessStatus: 'active',
      organizationId: SYNTH_ORG,
    },
    select: { id: true, organizationId: true },
  });
  if (!member || member.organizationId !== SYNTH_ORG) {
    throw new Error(`SYNTH_DELIVERY_MEMBER_NOT_FOUND:${email}:${SYNTH_ORG}`);
  }
  const active = await prisma.osRoleAssignment.findMany({
    where: {
      organizationId: SYNTH_ORG,
      memberId: member.id,
      endedAt: null,
    },
    select: { roleKey: true },
  });
  return {
    memberId: member.id,
    organizationId: member.organizationId,
    keys: [...new Set(active.map((row) => row.roleKey))].sort(),
  };
}

async function main(): Promise<void> {
  if (process.env.STAGING_FIXTURE_CONFIRM?.trim() !== STAGING_FIXTURE_CONFIRM_VALUE) {
    throw new Error('STAGING_FIXTURE_CONFIRM=1 required');
  }
  const dryRun = process.env.STAGING_FIXTURE_DRY_RUN?.trim() === '1';
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
  const databaseUrl = requireEnvFrom(process.env, 'OS_DATABASE_URL');
  assertStagingDatabaseUrl(databaseUrl);

  const prisma = getOsPrisma();
  if (!prisma) throw new Error('OS_DATABASE_URL prisma unavailable');

  const dbRows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  assertStagingDatabaseName(dbRows[0]?.name ?? '');

  const migRows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count FROM _prisma_migrations
  `;
  assertMigrationCount(Number(migRows[0]?.count ?? -1));

  const org = await prisma.osOrganization.findUnique({
    where: { id: SYNTH_ORG },
    select: { id: true, legalName: true },
  });
  if (!org || org.id !== SYNTH_ORG || org.legalName !== WAVE2_ROLE_FIXTURE_ORG_LEGAL_NAME) {
    throw new Error('REFUSING_NON_SYNTH_ORGANIZATION');
  }
  const realTenants = await prisma.osOrganization.findMany({
    where: { legalName: { contains: 'ISALWA Staging' } },
    select: { id: true },
  });
  if (realTenants.some((row) => row.id === SYNTH_ORG)) {
    throw new Error('REFUSING_TO_MUTATE_REAL_STAGING_TENANT');
  }

  const planned = [...plannedCapabilitiesFor('auxiliar-coordinacion')];
  const coordinacion = await activeRoleKeys(prisma, COORD_EMAIL);
  const plan = planCoordinacionDeliveryRecordMaterialization(coordinacion.keys, planned);

  log(`SYNTH_ORG id=${org.id} legalName=${org.legalName} database=${STAGING_DATABASE_NAME}`);
  log(`ROLE functionId=auxiliar-coordinacion label=Coordinación email=${COORD_EMAIL}`);
  log(`SYNTH_DELIVERY_BEFORE scopes=${coordinacion.keys.join(',')}`);
  log(`SYNTH_DELIVERY_PLANNED scopes=${[...planned].sort().join(',')}`);
  log(`SYNTH_DELIVERY_DELTA add=${plan.toGrant.join(',') || 'NONE'} end=NONE`);

  for (const email of BOUNDARY_EMAILS) {
    const boundary = await activeRoleKeys(prisma, email);
    if (boundary.keys.includes(DELIVERY_RECORD_SCOPE)) {
      throw new Error(`BOUNDARY_ALREADY_HOLDS_DELIVERY_RECORD:${email}`);
    }
    log(`BOUNDARY_UNCHANGED email=${email} hasDeliveryRecord=NO scopes=${boundary.keys.join(',')}`);
  }

  if (dryRun) {
    log(`SYNTH_DELIVERY_DRY_RUN granted=NO writes=NONE`);
    return;
  }

  if (plan.toGrant.length === 0) {
    log(`SYNTH_DELIVERY_ALREADY ${DELIVERY_RECORD_SCOPE}`);
    log(`SYNTH_DELIVERY_DONE email=${COORD_EMAIL} database=${STAGING_DATABASE_NAME} granted=NO`);
    return;
  }
  if (plan.toGrant.length !== 1 || plan.toGrant[0] !== DELIVERY_RECORD_SCOPE) {
    throw new Error(`REFUSING_UNEXPECTED_GRANT:${plan.toGrant.join(',')}`);
  }

  await prisma.osRoleAssignment.create({
    data: {
      id: randomUUID(),
      organizationId: SYNTH_ORG,
      memberId: coordinacion.memberId,
      roleKey: DELIVERY_RECORD_SCOPE,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    },
  });

  const after = await activeRoleKeys(prisma, COORD_EMAIL);
  const added = after.keys.filter((key) => !coordinacion.keys.includes(key));
  if (added.length !== 1 || added[0] !== DELIVERY_RECORD_SCOPE) {
    throw new Error(`UNEXPECTED_POST_GRANT_DELTA:${added.join(',')}`);
  }
  log(`SYNTH_DELIVERY_AFTER scopes=${after.keys.join(',')}`);
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
