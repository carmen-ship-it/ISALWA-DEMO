/**
 * Staging-only Wave 2 synthetic tenant + 9 V1 role logins (operator CLI).
 *
 * HOSTED_APP_SHA remains ef7eeab… — this file is fixture tooling only.
 *
 * Guard order (writes only after all pass):
 * 1. STAGING_FIXTURE_CONFIRM=1
 * 2. env presence
 * 3. Supabase project ref
 * 4. OS_DATABASE_URL host marker
 * 5. connect DB
 * 6. current_database() === isalwa_os_staging
 * 7. migration count === 29
 * 8. real-tenant protection
 * 9. fixture writes
 *
 * Clean-room prerequisite (workspace packages export dist/, which is gitignored):
 *   pnpm install --frozen-lockfile
 *   pnpm run fixture:wave2-roles:prepare
 *
 * Required env:
 *   OS_DATABASE_URL
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   STAGING_FIXTURE_CONFIRM=1
 *
 * Optional:
 *   FIXTURE_TOOL_SHA (defaults to git rev-parse HEAD when available)
 *
 * Receipt (no secrets): ~/.isalwa-secrets/isalwa-os-staging-wave2-role-fixtures.json
 * Passwords (local only, never in receipt): …-wave2-role-passwords.json
 *
 * Run (allowlisted IP, after FIXTURE_EXECUTION_READY):
 *   pnpm run fixture:wave2-roles:prepare
 *   STAGING_FIXTURE_CONFIRM=1 pnpm --filter @isalwa/os-database exec node --import tsx src/staging-wave2-role-fixtures.ts
 */
import { mkdirSync, writeFileSync, chmodSync, existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { V1_PLANNED_ASSIGNMENTS, type V1PlannedFunctionId } from '@isalwa/os-contracts';
import { PartyCommandService } from '@isalwa/os-party';
import { CommercialCommandService } from '@isalwa/os-commercial';
import { getOsPrisma } from './client';
import { PrismaOsWorkforceStore } from './prisma-workforce-store';
import { PrismaOsPartyStore } from './prisma-party-store';
import { PrismaOsCommercialStore } from './prisma-commercial-store';
import {
  HOSTED_APP_SHA,
  WAVE2_ROLE_FIXTURE_ORG_LEGAL_NAME,
  WAVE2_ROLE_FIXTURE_ORG_SLUG,
  WAVE2_SYNTH_PARTY_LEGAL_NAME,
  ROLE_EMAILS,
  assertPreConnectGuards,
  assertStagingDatabaseName,
  assertMigrationCount,
  assertNotRealTenant,
  assertSyntheticEmailAllowed,
  assertCapabilitiesMatchPlanned,
  requireEnvFrom,
  EXPECTED_MIGRATION_COUNT,
  STAGING_DATABASE_NAME,
} from './staging-wave2-role-fixtures-guards';

function log(line: string): void {
  const safe = line
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT_REDACTED]');
  // eslint-disable-next-line no-console
  console.log(safe);
}

function resolveFixtureToolSha(): string {
  const fromEnv = process.env.FIXTURE_TOOL_SHA?.trim();
  if (fromEnv) return fromEnv;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'UNKNOWN_FIXTURE_TOOL_SHA';
  }
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

async function ensureSupabaseUser(email: string, password: string): Promise<{
  id: string;
  created: boolean;
}> {
  assertSyntheticEmailAllowed(email);
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
    log(`SUPABASE_USER_REUSED id=${existing.id} email=${email}`);
    return { id: existing.id, created: false };
  }
  const res = await adminFetch('/auth/v1/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`ADMIN_CREATE_USER_FAILED:${res.status}:${email}`);
  const created = (await res.json()) as { id: string };
  log(`SUPABASE_USER_CREATED id=${created.id} email=${email}`);
  return { id: created.id, created: true };
}

function ctx(
  orgId: string,
  memberId: string,
  personId: string,
  authId: string,
): RequestContext {
  return {
    organizationId: orgId,
    actorMemberId: memberId,
    personId,
    authIdentityId: authId,
    correlationId: createId(),
    effectiveAt: new Date(),
  };
}

type RoleUserReceipt = {
  functionId: V1PlannedFunctionId;
  functionLabel: string;
  intendedProfileId: string;
  email: string;
  memberId: string;
  personId: string;
  authIdentityId: string;
  supabaseUserId: string;
  capabilities: readonly string[];
  created: boolean;
  reused: boolean;
};

async function main(): Promise<void> {
  // 1–4: env, confirm, supabase ref, database URL host (no writes)
  const { supabaseUrl, projectRef } = assertPreConnectGuards(process.env);

  const prisma = getOsPrisma();
  if (!prisma) throw new Error('OS_DATABASE_URL prisma unavailable');

  // 5–6: connect + current_database()
  const dbNameRows = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT current_database() AS name
  `;
  const currentDatabase = dbNameRows[0]?.name ?? '';
  assertStagingDatabaseName(currentDatabase);
  log(`CURRENT_DATABASE=${currentDatabase}`);

  // 7: migration count
  const migRows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count FROM _prisma_migrations
  `;
  const migrationCountBefore = Number(migRows[0]?.count ?? -1);
  assertMigrationCount(migrationCountBefore);
  log(`MIGRATION_COUNT_BEFORE=${migrationCountBefore}`);

  const fixtureToolSha = resolveFixtureToolSha();
  const secretsDir = join(homedir(), '.isalwa-secrets');
  mkdirSync(secretsDir, { recursive: true });
  const receiptPath = join(secretsDir, 'isalwa-os-staging-wave2-role-fixtures.json');
  const passwordPath = join(secretsDir, 'isalwa-os-staging-wave2-role-passwords.json');

  // 8: real tenant ids (read-only) — never write to these orgs
  const realTenantIds = new Set(
    (
      await prisma.osOrganization.findMany({
        where: { legalName: { contains: 'ISALWA Staging' } },
        select: { id: true },
      })
    ).map((o) => o.id),
  );

  const workforceStore = new PrismaOsWorkforceStore(prisma);
  const partyStore = new PrismaOsPartyStore(prisma);
  const commercialStore = new PrismaOsCommercialStore(prisma);
  const partySvc = new PartyCommandService(partyStore);
  const commercialSvc = new CommercialCommandService(commercialStore);

  let org = await prisma.osOrganization.findFirst({
    where: { legalName: WAVE2_ROLE_FIXTURE_ORG_LEGAL_NAME },
    orderBy: { createdAt: 'desc' },
  });

  let orgCreated = false;
  if (!org) {
    const bySlug = await prisma.osOrganization.findFirst({
      where: { slug: WAVE2_ROLE_FIXTURE_ORG_SLUG },
    });
    if (bySlug) {
      assertNotRealTenant(bySlug.id, realTenantIds);
      throw new Error('FIXTURE_ORG_SLUG_COLLISION_UNEXPECTED_LEGAL_NAME');
    }
    org = await workforceStore.seedOrganization(
      WAVE2_ROLE_FIXTURE_ORG_LEGAL_NAME,
      WAVE2_ROLE_FIXTURE_ORG_SLUG,
    );
    orgCreated = true;
    log(`ORG_CREATED id=${org.id}`);
  } else {
    log(`ORG_REUSED id=${org.id}`);
  }

  assertNotRealTenant(org.id, realTenantIds);

  const passwords: Record<string, string> = existsSync(passwordPath)
    ? (JSON.parse(readFileSync(passwordPath, 'utf8')) as Record<string, string>)
    : {};

  const roles: RoleUserReceipt[] = [];

  // 9: fixture writes — synthetic org only
  for (const planned of V1_PLANNED_ASSIGNMENTS) {
    const identity = ROLE_EMAILS[planned.functionId];
    assertSyntheticEmailAllowed(identity.email);
    assertCapabilitiesMatchPlanned(planned.functionId, planned.intendedCapabilities);

    let password = passwords[identity.email];
    if (!password) {
      password = `W2-${planned.functionId}-${randomBytes(12).toString('base64url')}!9`;
      passwords[identity.email] = password;
    }

    const { id: supabaseUserId, created: supabaseCreated } = await ensureSupabaseUser(
      identity.email,
      password,
    );

    const existingAuth = await prisma.osAuthIdentity.findFirst({
      where: {
        provider: 'supabase',
        providerSubject: supabaseUserId,
      },
    });

    let personId = existingAuth?.personId ?? randomUUID();
    let memberId: string;
    let authId = existingAuth?.id ?? randomUUID();
    let created = false;

    const existingMember = await prisma.osOrganizationMember.findFirst({
      where: { organizationId: org.id, personId },
    });

    if (!existingAuth) {
      await workforceStore.insertPerson({
        id: personId,
        givenName: identity.givenName,
        familyName: identity.familyName,
        version: 0,
      });
      memberId = randomUUID();
      await workforceStore.insertMember({
        id: memberId,
        organizationId: org.id,
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
        email: identity.email,
        status: 'active',
        invitedAt: null,
        activatedAt: new Date(),
        revokedAt: null,
      });
      created = true;
    } else if (!existingMember) {
      memberId = randomUUID();
      await workforceStore.insertMember({
        id: memberId,
        organizationId: org.id,
        personId,
        employmentStatus: 'active',
        accessStatus: 'active',
        employmentStartedAt: new Date(),
        employmentEndedAt: null,
        version: 0,
      });
      created = true;
    } else {
      memberId = existingMember.id;
    }

    const wanted = new Set(planned.intendedCapabilities);
    const current = await prisma.osRoleAssignment.findMany({
      where: { organizationId: org.id, memberId, endedAt: null },
    });
    for (const row of current) {
      if (!wanted.has(row.roleKey)) {
        await prisma.osRoleAssignment.update({
          where: { id: row.id },
          data: { endedAt: new Date() },
        });
        log(`ROLE_ENDED member=${memberId} roleKey=${row.roleKey}`);
      }
    }
    const activeKeys = new Set(
      (
        await prisma.osRoleAssignment.findMany({
          where: { organizationId: org.id, memberId, endedAt: null },
        })
      ).map((r) => r.roleKey),
    );
    for (const roleKey of planned.intendedCapabilities) {
      if (activeKeys.has(roleKey)) continue;
      await workforceStore.insertRoleAssignment({
        id: randomUUID(),
        organizationId: org.id,
        memberId,
        roleKey,
        effectiveAt: new Date('2020-01-01'),
        endedAt: null,
      });
      log(`ROLE_GRANTED member=${memberId} roleKey=${roleKey}`);
    }

    const finalCaps = (
      await prisma.osRoleAssignment.findMany({
        where: { organizationId: org.id, memberId, endedAt: null },
      })
    ).map((r) => r.roleKey);
    assertCapabilitiesMatchPlanned(planned.functionId, finalCaps);

    roles.push({
      functionId: planned.functionId,
      functionLabel: planned.functionLabel,
      intendedProfileId: planned.intendedProfileId,
      email: identity.email,
      memberId,
      personId,
      authIdentityId: authId,
      supabaseUserId,
      capabilities: planned.intendedCapabilities,
      created: created || supabaseCreated,
      reused: !(created || supabaseCreated),
    });
  }

  writeFileSync(passwordPath, JSON.stringify(passwords, null, 2), { mode: 0o600 });
  chmodSync(passwordPath, 0o600);
  log(`PASSWORDS_FILE=${passwordPath}`);

  const asesor = roles.find((r) => r.functionId === 'asesor-comercial');
  if (!asesor) throw new Error('ASESOR_MISSING');

  let party = await prisma.osParty.findFirst({
    where: {
      organizationId: org.id,
      legalName: WAVE2_SYNTH_PARTY_LEGAL_NAME,
    },
  });
  let partyId = party?.id;
  let opportunityId: string | null = null;
  let quoteId: string | null = null;
  let commercialCreated = false;

  if (!partyId) {
    const session = ctx(org.id, asesor.memberId, asesor.personId, asesor.authIdentityId);
    const createdParty = await partySvc.execute('CreateParty', session, {
      displayName: 'SYNTH Wave2 Cliente',
      partyKind: 'organization',
      legalName: WAVE2_SYNTH_PARTY_LEGAL_NAME,
      fiscalIdentity: { nit: 'W2-0000001', razonSocial: WAVE2_SYNTH_PARTY_LEGAL_NAME },
      initialRoleKey: 'customer',
      createCommercialAccount: true,
    });
    partyId = String(createdParty.data.partyId);
    log(`PARTY_CREATED partyId=${partyId}`);

    const opp = await commercialSvc.execute('CreateOpportunity', session, {
      partyId,
      title: 'SYNTH Wave2 — oportunidad mínima',
      stage: 'propuesta',
      expectedValueCentavos: 150000,
    });
    opportunityId = String(opp.data.opportunityId);
    log(`OPPORTUNITY_CREATED opportunityId=${opportunityId}`);

    const quote = await commercialSvc.execute('CreateQuote', session, {
      partyId,
      opportunityId,
      currency: 'BOB',
      notes: 'SYNTH Wave2 quote — acceptance only',
    });
    quoteId = String(quote.data.quoteId);
    await commercialSvc.execute('AddQuoteLine', session, {
      quoteId,
      description: 'SYNTH pieza cerámica',
      quantity: 4,
      unitLabel: 'pza',
      unitPriceCentavos: 22000,
    });
    await commercialSvc.execute('SubmitQuote', session, { quoteId });
    log(`QUOTE_SUBMITTED quoteId=${quoteId}`);
    commercialCreated = true;
  } else {
    const opp = await prisma.osOpportunity.findFirst({
      where: { organizationId: org.id, partyId },
      orderBy: { createdAt: 'asc' },
    });
    const quote = await prisma.osQuote.findFirst({
      where: { organizationId: org.id, partyId },
      orderBy: { createdAt: 'asc' },
    });
    opportunityId = opp?.id ?? null;
    quoteId = quote?.id ?? null;
    log(`COMMERCIAL_REUSED partyId=${partyId}`);
  }

  const supabase = createClient(supabaseUrl, requireEnvFrom(process.env, 'SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: asesor.email,
    password: passwords[asesor.email]!,
  });
  if (error || !data.session?.access_token || !data.user?.id) {
    throw new Error(`SIGNIN_VERIFY_FAILED:${error?.message ?? 'no session'}`);
  }
  const fp = createHash('sha256').update(data.session.access_token).digest('hex').slice(0, 12);
  log(`SIGNIN_VERIFY_PASS jwt_fp=${fp} email=${asesor.email}`);

  const migAfterRows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count FROM _prisma_migrations
  `;
  const migrationCountAfter = Number(migAfterRows[0]?.count ?? -1);
  assertMigrationCount(migrationCountAfter);

  const receipt = {
    purpose: 'wave2-v1-role-fixtures',
    createdAt: new Date().toISOString(),
    fixtureToolSha,
    hostedAppSha: HOSTED_APP_SHA,
    currentDatabase: STAGING_DATABASE_NAME,
    migrationCountBefore,
    migrationCountAfter,
    expectedMigrationCount: EXPECTED_MIGRATION_COUNT,
    organizationId: org.id,
    organizationLegalName: WAVE2_ROLE_FIXTURE_ORG_LEGAL_NAME,
    organizationSlug: WAVE2_ROLE_FIXTURE_ORG_SLUG,
    organizationCreated: orgCreated,
    organizationReused: !orgCreated,
    partyId,
    opportunityId,
    quoteId,
    commercialCreated,
    commercialReused: !commercialCreated,
    roles: roles.map((r) => ({
      functionId: r.functionId,
      functionLabel: r.functionLabel,
      intendedProfileId: r.intendedProfileId,
      email: r.email,
      memberId: r.memberId,
      personId: r.personId,
      authIdentityId: r.authIdentityId,
      supabaseUserId: r.supabaseUserId,
      capabilities: [...r.capabilities],
      created: r.created,
      reused: r.reused,
    })),
    explicitlyUnassigned: [
      'delivery.record',
      'commercial.order.convert',
      'commercial.exception.authorize',
      'production.review.member',
      'people.admin',
    ],
    cleanupIdentifiers: {
      organizationLegalName: WAVE2_ROLE_FIXTURE_ORG_LEGAL_NAME,
      organizationSlug: WAVE2_ROLE_FIXTURE_ORG_SLUG,
      partyLegalName: WAVE2_SYNTH_PARTY_LEGAL_NAME,
      emails: roles.map((r) => r.email),
    },
    realCustomerTenantMutations: 'NONE',
    supabaseProjectRef: projectRef,
  };

  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), { mode: 0o600 });
  chmodSync(receiptPath, 0o600);
  log(`RECEIPT_FILE=${receiptPath}`);
  log(
    JSON.stringify({
      ok: true,
      fixtureToolSha,
      hostedAppSha: HOSTED_APP_SHA,
      organizationId: org.id,
      roleCount: roles.length,
      partyId,
      migrationCountAfter,
      realCustomerTenantMutations: 'NONE',
    }),
  );
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
