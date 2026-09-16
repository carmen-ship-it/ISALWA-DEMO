/**
 * Wave A close — SYNTH-only people.admin + continuity fixtures (operator CLI).
 *
 * Guards (fail-closed):
 * - STAGING_FIXTURE_CONFIRM=1
 * - staging Supabase project + DB name/host
 * - organizationId MUST be SYNTH 01M2JKF77TXMJNDTKNCYNHH9G5
 * - REFUSES real tenant 01M2DV9F0V5DXS4G89AKF4D5SR
 *
 * Never logs passwords. Password file: ~/.isalwa-secrets/isalwa-os-staging-wave-a-continuity-passwords.json
 * Receipt (no secrets): ~/.isalwa-secrets/isalwa-os-staging-wave-a-continuity.json
 *
 * Run:
 *   STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database exec node --import tsx src/staging-wave-a-synth-continuity.ts
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
  WAVE_A_CONTINUITY_FIXTURE_EMAILS,
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

async function ensureOpenWork(args: {
  orgId: string;
  ownerMemberId: string;
  createdByMemberId: string;
  title: string;
  prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
}): Promise<string> {
  const { orgId, ownerMemberId, createdByMemberId, title, prisma } = args;
  assertNotRealTenant(orgId, new Set([REAL_ORG]));

  const existing = await prisma.osWorkItem.findFirst({
    where: { organizationId: orgId, ownerMemberId, status: 'open', title },
  });
  if (existing) {
    await prisma.osWorkReadModel.upsert({
      where: { workItemId: existing.id },
      create: {
        workItemId: existing.id,
        organizationId: orgId,
        title: existing.title,
        description: existing.description,
        status: existing.status,
        priority: existing.priority,
        ownerMemberId: existing.ownerMemberId,
        createdByMemberId: existing.createdByMemberId,
        subjectType: existing.subjectType,
        subjectId: existing.subjectId,
        dueAt: existing.dueAt,
        completedAt: existing.completedAt,
        cancelledAt: existing.cancelledAt,
        approvalStatus: 'none',
        ownershipChangeCount: 0,
      },
      update: {
        ownerMemberId: existing.ownerMemberId,
        status: 'open',
        title: existing.title,
      },
    });
    return existing.id;
  }

  const workItemId = createId();
  await prisma.osWorkItem.create({
    data: {
      id: workItemId,
      organizationId: orgId,
      ownerMemberId,
      createdByMemberId,
      title,
      description: 'Wave A continuity acceptance fixture',
      status: 'open',
      priority: 'normal',
      version: 0,
    },
  });
  await prisma.osWorkItemOwnershipHistory.create({
    data: {
      id: createId(),
      organizationId: orgId,
      workItemId,
      fromMemberId: null,
      toMemberId: ownerMemberId,
      changedByMemberId: createdByMemberId,
      reason: 'wave-a-continuity-fixture',
      changedAt: new Date(),
    },
  });
  await prisma.osWorkReadModel.create({
    data: {
      workItemId,
      organizationId: orgId,
      title,
      description: 'Wave A continuity acceptance fixture',
      status: 'open',
      priority: 'normal',
      ownerMemberId,
      createdByMemberId,
      approvalStatus: 'none',
      ownershipChangeCount: 0,
    },
  });
  return workItemId;
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
  const passwordPath = join(secretsDir, 'isalwa-os-staging-wave-a-continuity-passwords.json');
  const receiptPath = join(secretsDir, 'isalwa-os-staging-wave-a-continuity.json');

  const passwords: Record<string, string> = existsSync(passwordPath)
    ? (JSON.parse(readFileSync(passwordPath, 'utf8')) as Record<string, string>)
    : {};

  /** Role keys = capability scopes (not display titles). people.admin only on peopleAdmin. */
  const MEMBER_BASE_SCOPES = ['commercial.customer.create'] as const;
  const specs = [
    {
      email: 'w2.people-admin@isalwa.demo',
      givenName: 'WaveA',
      familyName: 'PeopleAdmin',
      scopes: ['people.admin'] as const,
      key: 'peopleAdmin',
    },
    {
      email: 'w2.cont-a@isalwa.demo',
      givenName: 'WaveA',
      familyName: 'ContA',
      scopes: MEMBER_BASE_SCOPES,
      key: 'memberA',
    },
    {
      email: 'w2.cont-b@isalwa.demo',
      givenName: 'WaveA',
      familyName: 'ContB',
      scopes: MEMBER_BASE_SCOPES,
      key: 'memberB',
    },
    {
      email: 'w2.cont-commercial@isalwa.demo',
      givenName: 'WaveA',
      familyName: 'ContCommercial',
      scopes: MEMBER_BASE_SCOPES,
      key: 'commercialOwner',
    },
    {
      email: 'w2.cont-approver@isalwa.demo',
      givenName: 'WaveA',
      familyName: 'ContApprover',
      scopes: MEMBER_BASE_SCOPES,
      key: 'approver',
    },
    {
      email: 'w2.cont-manager@isalwa.demo',
      givenName: 'WaveA',
      familyName: 'ContManager',
      scopes: MEMBER_BASE_SCOPES,
      key: 'manager',
    },
    {
      email: 'w2.cont-report@isalwa.demo',
      givenName: 'WaveA',
      familyName: 'ContReport',
      scopes: MEMBER_BASE_SCOPES,
      key: 'report',
    },
    {
      email: 'w2.cont-coverage@isalwa.demo',
      givenName: 'WaveA',
      familyName: 'ContCoverage',
      scopes: MEMBER_BASE_SCOPES,
      key: 'coverageHolder',
    },
  ] as const;

  for (const email of WAVE_A_CONTINUITY_FIXTURE_EMAILS) {
    assertFixtureToolEmailAllowed(email);
  }

  const members: Record<
    string,
    { email: string; memberId: string; personId: string; scopes: readonly string[] }
  > = {};

  for (const spec of specs) {
    let password = passwords[spec.email];
    if (!password) {
      password = `WA-${spec.key}-${randomBytes(12).toString('base64url')}!9`;
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

  const workItemId = await ensureOpenWork({
    orgId: SYNTH_ORG,
    ownerMemberId: member("memberA").memberId,
    createdByMemberId: member("peopleAdmin").memberId,
    title: 'Wave A continuidad — trabajo abierto',
    prisma,
  });
  log(`WORK_OK workItemId=${workItemId}`);

  // Manager → report relationship (active)
  const existingMgr = await prisma.osManagerAssignment.findFirst({
    where: {
      organizationId: SYNTH_ORG,
      memberId: member("report").memberId,
      managerMemberId: member("manager").memberId,
      endedAt: null,
    },
  });
  if (!existingMgr) {
    await workforceStore.insertManagerAssignment({
      id: createId(),
      organizationId: SYNTH_ORG,
      memberId: member("report").memberId,
      managerMemberId: member("manager").memberId,
      effectiveAt: new Date(),
      endedAt: null,
    });
  }
  log('MANAGER_OK');

  // Active delegation FROM manager TO report
  const existingDel = await prisma.osDelegation.findFirst({
    where: {
      organizationId: SYNTH_ORG,
      delegatorMemberId: member("manager").memberId,
      delegateMemberId: member("report").memberId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  let delegationId = existingDel?.id;
  if (!existingDel) {
    delegationId = createId();
    await workforceStore.insertDelegation({
      id: delegationId,
      organizationId: SYNTH_ORG,
      delegatorMemberId: member("manager").memberId,
      delegateMemberId: member("report").memberId,
      scopes: ['approval.act'],
      startsAt: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600_000),
      revokedAt: null,
    });
  }
  log(`DELEGATION_OK id=${delegationId}`);

  // Pending approval where commercialOwner is assigned approver (blocks terminate of commercialOwner)
  const pending = await prisma.osApprovalRequest.findFirst({
    where: {
      organizationId: SYNTH_ORG,
      approverMemberId: member("approver").memberId,
      status: 'pending',
    },
  });
  let approvalId = pending?.id;
  if (!pending) {
    approvalId = createId();
    await prisma.osApprovalRequest.create({
      data: {
        id: approvalId,
        organizationId: SYNTH_ORG,
        subjectType: 'organization_member',
        subjectId: member("memberA").memberId,
        requestedByMemberId: member("peopleAdmin").memberId,
        approverMemberId: member("approver").memberId,
        status: 'pending',
        contextSnapshotJson: {
          purpose: 'wave-a-continuity-fixture',
          note: 'synthetic pending approval for terminate preflight',
        },
      },
    });
  }
  log(`APPROVAL_OK id=${approvalId}`);

  // Disposable SYNTH commercial account + open opportunity on commercialOwner
  // (split-authority: people.admin sees blocker, cannot ReassignCommercialAccountOwner).
  const WAVE_A_PARTY_LEGAL = 'SYNTH Wave A Continuidad Cliente';
  let party = await prisma.osParty.findFirst({
    where: { organizationId: SYNTH_ORG, legalName: WAVE_A_PARTY_LEGAL },
  });
  if (!party) {
    const partyId = createId();
    party = await prisma.osParty.create({
      data: {
        id: partyId,
        organizationId: SYNTH_ORG,
        partyKind: 'organization',
        displayName: 'SYNTH Wave A Continuidad',
        legalName: WAVE_A_PARTY_LEGAL,
        status: 'active',
        version: 0,
      },
    });
    await prisma.osPartyRoleAssignment.create({
      data: {
        id: createId(),
        organizationId: SYNTH_ORG,
        partyId,
        roleKey: 'customer',
        effectiveAt: new Date(),
        endedAt: null,
      },
    });
    log(`PARTY_CREATED partyId=${partyId}`);
  } else {
    log(`PARTY_REUSED partyId=${party.id}`);
  }

  let account = await prisma.osCommercialAccount.findFirst({
    where: { organizationId: SYNTH_ORG, partyId: party.id },
  });
  if (!account) {
    account = await prisma.osCommercialAccount.create({
      data: {
        id: createId(),
        organizationId: SYNTH_ORG,
        partyId: party.id,
        ownerMemberId: member("commercialOwner").memberId,
        status: 'active',
        version: 0,
      },
    });
    log(`ACCOUNT_CREATED accountId=${account.id}`);
  } else if (account.ownerMemberId !== member("commercialOwner").memberId || account.status !== 'active') {
    account = await prisma.osCommercialAccount.update({
      where: { id: account.id },
      data: {
        ownerMemberId: member("commercialOwner").memberId,
        status: 'active',
        version: { increment: 1 },
      },
    });
    log(`ACCOUNT_RECONCILED accountId=${account.id}`);
  } else {
    log(`ACCOUNT_REUSED accountId=${account.id}`);
  }

  let opportunity = await prisma.osOpportunity.findFirst({
    where: {
      organizationId: SYNTH_ORG,
      partyId: party.id,
      title: 'Wave A continuidad — oportunidad abierta',
    },
  });
  if (!opportunity) {
    const opportunityId = createId();
    opportunity = await prisma.osOpportunity.create({
      data: {
        id: opportunityId,
        organizationId: SYNTH_ORG,
        partyId: party.id,
        ownerMemberId: member("commercialOwner").memberId,
        title: 'Wave A continuidad — oportunidad abierta',
        stage: 'propuesta',
        status: 'open',
        expectedValueCentavos: BigInt(100000),
        version: 0,
      },
    });
    await prisma.osOpportunityReadModel.upsert({
      where: { opportunityId },
      create: {
        opportunityId,
        organizationId: SYNTH_ORG,
        partyId: party.id,
        ownerMemberId: member("commercialOwner").memberId,
        title: 'Wave A continuidad — oportunidad abierta',
        stage: 'propuesta',
        status: 'open',
        expectedValueCentavos: BigInt(100000),
        createdAt: new Date(),
      },
      update: {
        ownerMemberId: member("commercialOwner").memberId,
        status: 'open',
      },
    });
    log(`OPPORTUNITY_CREATED opportunityId=${opportunityId}`);
  } else if (
    opportunity.ownerMemberId !== member("commercialOwner").memberId ||
    opportunity.status !== 'open'
  ) {
    opportunity = await prisma.osOpportunity.update({
      where: { id: opportunity.id },
      data: {
        ownerMemberId: member("commercialOwner").memberId,
        status: 'open',
        version: { increment: 1 },
      },
    });
    await prisma.osOpportunityReadModel.upsert({
      where: { opportunityId: opportunity.id },
      create: {
        opportunityId: opportunity.id,
        organizationId: SYNTH_ORG,
        partyId: party.id,
        ownerMemberId: member("commercialOwner").memberId,
        title: opportunity.title,
        stage: opportunity.stage,
        status: 'open',
        expectedValueCentavos: opportunity.expectedValueCentavos,
        createdAt: new Date(),
      },
      update: {
        ownerMemberId: member("commercialOwner").memberId,
        status: 'open',
      },
    });
    log(`OPPORTUNITY_RECONCILED opportunityId=${opportunity.id}`);
  } else {
    log(`OPPORTUNITY_REUSED opportunityId=${opportunity.id}`);
  }

  // Customer coverage grants (distinct from commercial account ownership).
  // Active primary on coverageHolder; active acting on commercialOwner;
  // expired + revoked rows must NOT block.
  const now = Date.now();
  const coveragePartyId = party.id;
  const coveragePrisma = prisma;
  async function ensureCoverageGrant(args: {
    primaryOwnerMemberId: string;
    actingAdvisorMemberId: string;
    startsAt: Date;
    endsAt: Date | null;
    revokedAt: Date | null;
  }): Promise<string> {
    const existing = await coveragePrisma.osCustomerCoverageGrant.findFirst({
      where: {
        organizationId: SYNTH_ORG,
        customerPartyId: coveragePartyId,
        primaryOwnerMemberId: args.primaryOwnerMemberId,
        actingAdvisorMemberId: args.actingAdvisorMemberId,
        endsAt: args.endsAt,
        revokedAt: args.revokedAt,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      return existing.id;
    }
    const id = createId();
    await coveragePrisma.osCustomerCoverageGrant.create({
      data: {
        id,
        organizationId: SYNTH_ORG,
        customerPartyId: coveragePartyId,
        primaryOwnerMemberId: args.primaryOwnerMemberId,
        actingAdvisorMemberId: args.actingAdvisorMemberId,
        grantType: 'commercial.customer.coverage',
        startsAt: args.startsAt,
        endsAt: args.endsAt,
        revokedAt: args.revokedAt,
        recordedAt: new Date(),
        recordedByMemberId: member('peopleAdmin').memberId,
      },
    });
    return id;
  }

  const activePrimaryCoverageId = await ensureCoverageGrant({
    primaryOwnerMemberId: member("coverageHolder").memberId,
    actingAdvisorMemberId: member("memberB").memberId,
    startsAt: new Date(now - 7 * 24 * 3600_000),
    endsAt: null,
    revokedAt: null,
  });
  log(`COVERAGE_PRIMARY_OK id=${activePrimaryCoverageId}`);

  const activeActingCoverageId = await ensureCoverageGrant({
    primaryOwnerMemberId: member("memberB").memberId,
    actingAdvisorMemberId: member("commercialOwner").memberId,
    startsAt: new Date(now - 3 * 24 * 3600_000),
    endsAt: null,
    revokedAt: null,
  });
  log(`COVERAGE_ACTING_OK id=${activeActingCoverageId}`);

  const expiredCoverageId = await ensureCoverageGrant({
    primaryOwnerMemberId: member("coverageHolder").memberId,
    actingAdvisorMemberId: member("approver").memberId,
    startsAt: new Date(now - 90 * 24 * 3600_000),
    endsAt: new Date(now - 30 * 24 * 3600_000),
    revokedAt: null,
  });
  log(`COVERAGE_EXPIRED_OK id=${expiredCoverageId}`);

  const revokedCoverageId = await ensureCoverageGrant({
    primaryOwnerMemberId: member("approver").memberId,
    actingAdvisorMemberId: member("coverageHolder").memberId,
    startsAt: new Date(now - 60 * 24 * 3600_000),
    endsAt: null,
    revokedAt: new Date(now - 14 * 24 * 3600_000),
  });
  log(`COVERAGE_REVOKED_OK id=${revokedCoverageId}`);

  // Optional: clear active coverage for terminate-after-resolution proof (SYNTH only).
  if (process.env.WAVE_A_REVOKE_ACTIVE_COVERAGE === '1') {
    await prisma.osCustomerCoverageGrant.updateMany({
      where: {
        organizationId: SYNTH_ORG,
        id: { in: [activePrimaryCoverageId, activeActingCoverageId] },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    log('COVERAGE_ACTIVE_REVOKED_FOR_ACCEPTANCE');
  }

  // Protected-seven / REAL party count snapshot (read-only)
  const realPartyCount = await prisma.osParty.count({
    where: { organizationId: REAL_ORG },
  });
  const realMemberCount = await prisma.osOrganizationMember.count({
    where: { organizationId: REAL_ORG },
  });
  const realActiveCustomerCount = await prisma.osParty.count({
    where: {
      organizationId: REAL_ORG,
      status: 'active',
      roleAssignments: { some: { roleKey: 'customer', endedAt: null } },
    },
  });
  const realCoverageCount = await prisma.osCustomerCoverageGrant.count({
    where: { organizationId: REAL_ORG },
  });

  writeFileSync(passwordPath, JSON.stringify(passwords, null, 2), { mode: 0o600 });
  chmodSync(passwordPath, 0o600);
  log(`PASSWORDS_FILE=${passwordPath}`);

  const receipt = {
    purpose: 'wave-a-synth-continuity-acceptance',
    createdAt: new Date().toISOString(),
    organizationId: SYNTH_ORG,
    realTenantRefused: REAL_ORG,
    realPartyCountSnapshot: realPartyCount,
    realMemberCountSnapshot: realMemberCount,
    realActiveCustomerCountSnapshot: realActiveCustomerCount,
    realCoverageCountSnapshot: realCoverageCount,
    peopleAdmin: member("peopleAdmin"),
    memberA: member("memberA"),
    memberB: member("memberB"),
    commercialOwner: member("commercialOwner"),
    approver: member("approver"),
    manager: member("manager"),
    report: member("report"),
    coverageHolder: member("coverageHolder"),
    workItemId,
    delegationId,
    approvalId,
    partyId: party.id,
    commercialAccountId: account.id,
    opportunityId: opportunity.id,
    activePrimaryCoverageId,
    activeActingCoverageId,
    expiredCoverageId,
    revokedCoverageId,
    note: 'peopleAdmin scopes MUST be people.admin only; no commercial.account.reassign; coverage resolution = FOUNDATION_GAP',
  };
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), { mode: 0o600 });
  chmodSync(receiptPath, 0o600);
  log(`RECEIPT_FILE=${receiptPath}`);
  log('WAVE_A_SYNTH_CONTINUITY_READY');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
