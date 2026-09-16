/**
 * Wave B SYNTH-only issue memory actors fixture (operator CLI).
 *
 * Guards (fail-closed):
 * - STAGING_FIXTURE_CONFIRM=1
 * - staging Supabase project + DB name/host
 * - organizationId MUST be SYNTH 01M2JKF77TXMJNDTKNCYNHH9G5
 * - REFUSES real tenant 01M2DV9F0V5DXS4G89AKF4D5SR
 *
 * Never logs passwords. Password file: ~/.isalwa-secrets/isalwa-os-staging-wave-b-issue-memory-passwords.json
 * Receipt (no secrets): ~/.isalwa-secrets/isalwa-os-staging-wave-b-issue-memory.json
 *
 * Actors:
 * - w2.issue-reporter@isalwa.demo — member_active only (no issue.manage)
 * - w2.issue-manager@isalwa.demo — issue.manage (+ member base)
 * - w2.issue-work@isalwa.demo — can CreateWorkItem (member_active is enough)
 *
 * Run:
 *   STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database exec node --import tsx src/staging-wave-b-issue-memory.ts
 */
import { mkdirSync, writeFileSync, chmodSync, existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { createId } from '@isalwa/ts-utils';
import { getOsPrisma } from './client';
import { PrismaOsWorkforceStore } from './prisma-workforce-store';
import {
  STAGING_SUPABASE_PROJECT_REF,
  STAGING_DATABASE_NAME,
  STAGING_DATABASE_HOST_MARKER,
  EXPECTED_MIGRATION_COUNT,
  STAGING_FIXTURE_CONFIRM_VALUE,
  WAVE_B_ISSUE_MEMORY_EMAILS,
  assertFixtureToolEmailAllowed,
  assertNotRealTenant,
  assertStagingDatabaseName,
  assertMigrationCount,
  requireEnvFrom,
} from './staging-wave2-role-fixtures-guards';
import { reconcileActiveGrants } from './staging-wave2-role-fixtures-lib';

const SYNTH_ORG = '01M2JKF77TXMJNDTKNCYNHH9G5';
const REAL_ORG = '01M2DV9F0V5DXS4G89AKF4D5SR';

function log(line: string): void {
  // eslint-disable-next-line no-console
  console.log(
    line
      .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT_REDACTED]'),
  );
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = requireEnvFrom(process.env, 'SUPABASE_URL').replace(/\/$/, '');
  const key = requireEnvFrom(process.env, 'SUPABASE_SERVICE_ROLE_KEY');
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      ...(init.headers ?? {}),
    },
  });
}

async function ensureSupabaseUser(email: string, password: string): Promise<string> {
  assertFixtureToolEmailAllowed(email);
  const list = await adminFetch(`/auth/v1/admin/users?page=1&per_page=200`);
  if (!list.ok) throw new Error(`ADMIN_LIST_USERS_FAILED:${list.status}`);
  const body = (await list.json()) as { users?: Array<{ id: string; email?: string }> };
  const existing = (body.users ?? []).find(
    (u) => (u.email ?? '').toLowerCase() === email.toLowerCase(),
  );
  if (existing?.id) {
    const upd = await adminFetch(`/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, email_confirm: true }),
    });
    if (!upd.ok) throw new Error(`ADMIN_RESET_PASSWORD_FAILED:${upd.status}`);
    log(`SUPABASE_USER_REUSED email=${email}`);
    return existing.id;
  }
  const res = await adminFetch('/auth/v1/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`ADMIN_CREATE_USER_FAILED:${res.status}:${await res.text()}`);
  const created = (await res.json()) as { id: string };
  log(`SUPABASE_USER_CREATED email=${email}`);
  return created.id;
}

async function ensureMember(args: {
  orgId: string;
  email: string;
  givenName: string;
  familyName: string;
  supabaseUserId: string;
  scopes: readonly string[];
  workforceStore: PrismaOsWorkforceStore;
  prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
}): Promise<{ memberId: string; personId: string; authId: string }> {
  const { orgId, email, givenName, familyName, supabaseUserId, scopes, workforceStore, prisma } =
    args;
  assertFixtureToolEmailAllowed(email);
  assertNotRealTenant(orgId, new Set([REAL_ORG]));

  const existingAuthBySubject = await prisma.osAuthIdentity.findFirst({
    where: { provider: 'supabase', providerSubject: supabaseUserId },
  });
  const existingAuthByEmail =
    existingAuthBySubject ??
    (await prisma.osAuthIdentity.findFirst({
      where: { provider: 'supabase', email: { equals: email, mode: 'insensitive' } },
    }));

  let personId = existingAuthByEmail?.personId ?? randomUUID();
  let authId = existingAuthByEmail?.id ?? randomUUID();
  let memberId: string;

  const existingMember = await prisma.osOrganizationMember.findFirst({
    where: { organizationId: orgId, personId },
  });

  if (!existingAuthByEmail) {
    await workforceStore.insertPerson({
      id: personId,
      givenName,
      familyName,
      version: 0,
    });
    memberId = randomUUID();
    await workforceStore.insertMember({
      id: memberId,
      organizationId: orgId,
      personId,
      employmentStatus: 'active',
      accessStatus: 'active',
      employmentStartedAt: new Date(),
      employmentEndedAt: null,
      version: 0,
    });
    await workforceStore.insertAuthIdentity({
      id: authId,
      personId,
      provider: 'supabase',
      providerSubject: supabaseUserId,
      email,
      status: 'active',
      invitedAt: null,
      activatedAt: new Date(),
      revokedAt: null,
    });
  } else {
    if (existingAuthByEmail.providerSubject !== supabaseUserId) {
      await prisma.osAuthIdentity.update({
        where: { id: existingAuthByEmail.id },
        data: {
          providerSubject: supabaseUserId,
          status: 'active',
          revokedAt: null,
          activatedAt: existingAuthByEmail.activatedAt ?? new Date(),
          email,
        },
      });
    }
    if (!existingMember) {
      memberId = randomUUID();
      await workforceStore.insertMember({
        id: memberId,
        organizationId: orgId,
        personId,
        employmentStatus: 'active',
        accessStatus: 'active',
        employmentStartedAt: new Date(),
        employmentEndedAt: null,
        version: 0,
      });
    } else {
      memberId = existingMember.id;
      if (existingMember.accessStatus !== 'active' || existingMember.employmentStatus !== 'active') {
        await prisma.osOrganizationMember.update({
          where: { id: memberId },
          data: {
            accessStatus: 'active',
            employmentStatus: 'active',
            employmentEndedAt: null,
            version: { increment: 1 },
          },
        });
      }
    }
  }

  const current = await prisma.osRoleAssignment.findMany({
    where: { organizationId: orgId, memberId, endedAt: null },
  });
  const plan = reconcileActiveGrants(
    current.map((r) => r.roleKey),
    scopes,
  );
  for (const roleKey of plan.toEnd) {
    const row = current.find((r) => r.roleKey === roleKey);
    if (!row) continue;
    await prisma.osRoleAssignment.update({
      where: { id: row.id },
      data: { endedAt: new Date() },
    });
  }
  for (const roleKey of plan.toGrant) {
    await workforceStore.insertRoleAssignment({
      id: createId(),
      organizationId: orgId,
      memberId,
      roleKey,
      effectiveAt: new Date(),
      endedAt: null,
    });
  }

  return { memberId, personId, authId };
}

async function main(): Promise<void> {
  if (process.env.STAGING_FIXTURE_CONFIRM !== STAGING_FIXTURE_CONFIRM_VALUE) {
    throw new Error('STAGING_FIXTURE_CONFIRM_REQUIRED');
  }
  const dbUrl = requireEnvFrom(process.env, 'OS_DATABASE_URL');
  if (!dbUrl.includes(STAGING_DATABASE_HOST_MARKER)) {
    throw new Error('UNEXPECTED_DATABASE_HOST');
  }
  const supabaseUrl = requireEnvFrom(process.env, 'SUPABASE_URL');
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  if (projectRef !== STAGING_SUPABASE_PROJECT_REF) {
    throw new Error(`UNEXPECTED_SUPABASE_PROJECT_REF:${projectRef}`);
  }
  requireEnvFrom(process.env, 'SUPABASE_ANON_KEY');
  requireEnvFrom(process.env, 'SUPABASE_SERVICE_ROLE_KEY');

  const prisma = getOsPrisma();
  if (!prisma) throw new Error('PRISMA_UNAVAILABLE');
  const dbName = await prisma.$queryRawUnsafe<Array<{ current_database: string }>>(
    'SELECT current_database()',
  );
  assertStagingDatabaseName(dbName[0]?.current_database ?? '');
  const mig = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    'SELECT count(*)::bigint AS count FROM _prisma_migrations',
  );
  assertMigrationCount(Number(mig[0]?.count ?? -1));

  const org = await prisma.osOrganization.findUnique({ where: { id: SYNTH_ORG } });
  if (!org) throw new Error('SYNTH_ORG_MISSING');
  assertNotRealTenant(SYNTH_ORG, new Set([REAL_ORG]));

  const workforceStore = new PrismaOsWorkforceStore(prisma);
  const secretsDir = join(homedir(), '.isalwa-secrets');
  mkdirSync(secretsDir, { recursive: true });
  const passwordPath = join(secretsDir, 'isalwa-os-staging-wave-b-issue-memory-passwords.json');
  const receiptPath = join(secretsDir, 'isalwa-os-staging-wave-b-issue-memory.json');

  const passwords: Record<string, string> = existsSync(passwordPath)
    ? (JSON.parse(readFileSync(passwordPath, 'utf8')) as Record<string, string>)
    : {};

  /**
   * Wave B Issue Memory actors:
   * - issue-reporter: member_active only (no issue.manage)
   * - issue-manager: issue.manage (+ member base)
   * - issue-work: can CreateWorkItem (member_active is enough)
   *
   * No people.admin or system.admin grants for issue management.
   */
  const specs = [
    {
      email: 'w2.issue-reporter@isalwa.demo',
      givenName: 'WaveB',
      familyName: 'IssueReporter',
      scopes: [] as readonly string[], // member_active only, no additional scopes
      key: 'issueReporter',
    },
    {
      email: 'w2.issue-manager@isalwa.demo',
      givenName: 'WaveB',
      familyName: 'IssueManager',
      scopes: ['issue.manage'] as readonly string[], // issue.manage scope only
      key: 'issueManager',
    },
    {
      email: 'w2.issue-work@isalwa.demo',
      givenName: 'WaveB',
      familyName: 'IssueWork',
      scopes: [] as readonly string[], // member_active is enough for CreateWorkItem
      key: 'issueWork',
    },
  ] as const;

  for (const email of WAVE_B_ISSUE_MEMORY_EMAILS) {
    assertFixtureToolEmailAllowed(email);
  }

  const members: Record<
    string,
    { email: string; memberId: string; personId: string; scopes: readonly string[] }
  > = {};

  for (const spec of specs) {
    let password = passwords[spec.email];
    if (!password) {
      password = `WB-${spec.key}-${randomBytes(12).toString('base64url')}!9`;
      passwords[spec.email] = password;
    }
    const supabaseUserId = await ensureSupabaseUser(spec.email, password);
    const ensured = await ensureMember({
      orgId: SYNTH_ORG,
      email: spec.email,
      givenName: spec.givenName,
      familyName: spec.familyName,
      supabaseUserId,
      scopes: spec.scopes,
      workforceStore,
      prisma,
    });
    members[spec.key] = {
      email: spec.email,
      memberId: ensured.memberId,
      personId: ensured.personId,
      scopes: [...spec.scopes],
    };
    log(`MEMBER_OK key=${spec.key} memberId=${ensured.memberId}`);
  }

  function member(key: (typeof specs)[number]['key']) {
    const row = members[key];
    if (!row) throw new Error(`MEMBER_MISSING:${key}`);
    return row;
  }

  // Create a sample open work item for issueWork to own (for LinkIssueWork tests)
  const existingWorkItem = await prisma.osWorkItem.findFirst({
    where: {
      organizationId: SYNTH_ORG,
      ownerMemberId: member('issueWork').memberId,
      title: 'Wave B issue-memory — sample work item',
    },
  });
  let sampleWorkItemId: string;
  if (existingWorkItem) {
    sampleWorkItemId = existingWorkItem.id;
    log(`WORK_ITEM_REUSED workItemId=${sampleWorkItemId}`);
  } else {
    sampleWorkItemId = createId();
    await prisma.osWorkItem.create({
      data: {
        id: sampleWorkItemId,
        organizationId: SYNTH_ORG,
        ownerMemberId: member('issueWork').memberId,
        createdByMemberId: member('issueWork').memberId,
        title: 'Wave B issue-memory — sample work item',
        description: 'Sample work item for issue-work linking tests',
        status: 'open',
        priority: 'normal',
        version: 0,
      },
    });
    await prisma.osWorkReadModel.create({
      data: {
        workItemId: sampleWorkItemId,
        organizationId: SYNTH_ORG,
        title: 'Wave B issue-memory — sample work item',
        description: 'Sample work item for issue-work linking tests',
        status: 'open',
        priority: 'normal',
        ownerMemberId: member('issueWork').memberId,
        createdByMemberId: member('issueWork').memberId,
        approvalStatus: 'none',
        ownershipChangeCount: 0,
      },
    });
    log(`WORK_ITEM_CREATED workItemId=${sampleWorkItemId}`);
  }

  // Protected-seven / REAL party count snapshot (read-only)
  const realPartyCount = await prisma.osParty.count({
    where: { organizationId: REAL_ORG },
  });
  const realMemberCount = await prisma.osOrganizationMember.count({
    where: { organizationId: REAL_ORG },
  });

  writeFileSync(passwordPath, JSON.stringify(passwords, null, 2), { mode: 0o600 });
  chmodSync(passwordPath, 0o600);
  log(`PASSWORDS_FILE=${passwordPath}`);

  const receipt = {
    purpose: 'wave-b-synth-issue-memory-acceptance',
    createdAt: new Date().toISOString(),
    organizationId: SYNTH_ORG,
    realTenantRefused: REAL_ORG,
    realPartyCountSnapshot: realPartyCount,
    realMemberCountSnapshot: realMemberCount,
    issueReporter: member('issueReporter'),
    issueManager: member('issueManager'),
    issueWork: member('issueWork'),
    sampleWorkItemId,
    note: 'issueManager has issue.manage only; no people.admin or system.admin for issue operations',
  };
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), { mode: 0o600 });
  chmodSync(receiptPath, 0o600);
  log(`RECEIPT_FILE=${receiptPath}`);
  log('WAVE_B_SYNTH_ISSUE_MEMORY_READY');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
