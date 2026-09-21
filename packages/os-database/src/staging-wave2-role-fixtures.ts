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
 *   corepack pnpm install --frozen-lockfile
 *   corepack pnpm run fixture:wave2-roles:prepare
 * Prepare uses `corepack pnpm` (not a nested bare `pnpm` binary).
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
 *   — nine business personas only; fixture seed actor uses ephemeral password
 *
 * Fixture seed actor (not a business persona under acceptance):
 *   w2.fixture-seed@isalwa.demo with master_data.admin + commercial.account.reassign
 *   Creates synthetic Party; reassigns CommercialAccount to Asesor.
 *   Opportunity / Quote are created (or ownership reconciled) so Asesor owns them.
 *   Asesor scopes stay planned-only — no extra seed authority on Asesor.
 *
 * Run (allowlisted IP, after FIXTURE_EXECUTION_READY):
 *   corepack pnpm run fixture:wave2-roles:prepare
 *   STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database exec node --import tsx src/staging-wave2-role-fixtures.ts
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
  WAVE2_FIXTURE_SEED_EMAIL,
  WAVE2_FIXTURE_SEED_SCOPES,
  ROLE_EMAILS,
  assertPreConnectGuards,
  assertStagingDatabaseName,
  assertMigrationCount,
  assertNotRealTenant,
  assertSyntheticEmailAllowed,
  assertFixtureToolEmailAllowed,
  assertCapabilitiesMatchPlanned,
  requireEnvFrom,
  EXPECTED_MIGRATION_COUNT,
  STAGING_DATABASE_NAME,
} from './staging-wave2-role-fixtures-guards';
import {
  CommercialProjectionConsumer,
  replayCommercialProjectionForOrg,
} from '@isalwa/os-query';
import { PrismaOsProjectionStore } from './prisma-projection-store';
import {
  assertAsesorDeniedCreateParty,
  assertCommercialSeedActorEmail,
  expectedWave2FixtureCounts,
  fixtureSeedActorSpec,
  planSynthCommercialOwnership,
  reconcileActiveGrants,
} from './staging-wave2-role-fixtures-lib';

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

type SeedActorReceipt = {
  email: string;
  memberId: string;
  personId: string;
  authIdentityId: string;
  supabaseUserId: string;
  scopes: readonly string[];
  purpose: 'fixture-setup-only';
  isBusinessRole: false;
  created: boolean;
  reused: boolean;
};

async function ensureOrgMemberIdentity(args: {
  orgId: string;
  email: string;
  givenName: string;
  familyName: string;
  supabaseUserId: string;
  workforceStore: PrismaOsWorkforceStore;
  prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
}): Promise<{
  personId: string;
  memberId: string;
  authId: string;
  created: boolean;
}> {
  const { orgId, email, givenName, familyName, supabaseUserId, workforceStore, prisma } = args;
  assertFixtureToolEmailAllowed(email);

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
    where: { organizationId: orgId, personId },
  });

  if (!existingAuth) {
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
    created = true;
  } else if (!existingMember) {
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
    created = true;
  } else {
    memberId = existingMember.id;
  }

  return { personId, memberId, authId, created };
}

async function reconcileMemberScopes(args: {
  orgId: string;
  memberId: string;
  wanted: readonly string[];
  workforceStore: PrismaOsWorkforceStore;
  prisma: NonNullable<ReturnType<typeof getOsPrisma>>;
}): Promise<string[]> {
  const { orgId, memberId, wanted, workforceStore, prisma } = args;
  const current = await prisma.osRoleAssignment.findMany({
    where: { organizationId: orgId, memberId, endedAt: null },
  });
  const plan = reconcileActiveGrants(
    current.map((r) => r.roleKey),
    wanted,
  );
  for (const roleKey of plan.toEnd) {
    const row = current.find((r) => r.roleKey === roleKey);
    if (!row) continue;
    await prisma.osRoleAssignment.update({
      where: { id: row.id },
      data: { endedAt: new Date() },
    });
    log(`ROLE_ENDED member=${memberId} roleKey=${roleKey}`);
  }
  for (const roleKey of plan.toGrant) {
    await workforceStore.insertRoleAssignment({
      id: randomUUID(),
      organizationId: orgId,
      memberId,
      roleKey,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });
    log(`ROLE_GRANTED member=${memberId} roleKey=${roleKey}`);
  }
  return (
    await prisma.osRoleAssignment.findMany({
      where: { organizationId: orgId, memberId, endedAt: null },
    })
  ).map((r) => r.roleKey);
}

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

  // Use orgId only — Prisma OsOrganization ≠ OrganizationRecord from seedOrganization.
  const existingOrg = await prisma.osOrganization.findFirst({
    where: { legalName: WAVE2_ROLE_FIXTURE_ORG_LEGAL_NAME },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  let orgId: string;
  let orgCreated = false;
  if (!existingOrg) {
    const bySlug = await prisma.osOrganization.findFirst({
      where: { slug: WAVE2_ROLE_FIXTURE_ORG_SLUG },
      select: { id: true },
    });
    if (bySlug) {
      assertNotRealTenant(bySlug.id, realTenantIds);
      throw new Error('FIXTURE_ORG_SLUG_COLLISION_UNEXPECTED_LEGAL_NAME');
    }
    const seeded = await workforceStore.seedOrganization(
      WAVE2_ROLE_FIXTURE_ORG_LEGAL_NAME,
      WAVE2_ROLE_FIXTURE_ORG_SLUG,
    );
    orgId = seeded.id;
    orgCreated = true;
    log(`ORG_CREATED id=${orgId}`);
  } else {
    orgId = existingOrg.id;
    log(`ORG_REUSED id=${orgId}`);
  }

  assertNotRealTenant(orgId, realTenantIds);

  const passwords: Record<string, string> = existsSync(passwordPath)
    ? (JSON.parse(readFileSync(passwordPath, 'utf8')) as Record<string, string>)
    : {};

  const roles: RoleUserReceipt[] = [];

  // 9: fixture writes — synthetic org only (nine business personas)
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

    const ensured = await ensureOrgMemberIdentity({
      orgId: orgId,
      email: identity.email,
      givenName: identity.givenName,
      familyName: identity.familyName,
      supabaseUserId,
      workforceStore,
      prisma,
    });

    const finalCaps = await reconcileMemberScopes({
      orgId: orgId,
      memberId: ensured.memberId,
      wanted: planned.intendedCapabilities,
      workforceStore,
      prisma,
    });
    assertCapabilitiesMatchPlanned(planned.functionId, finalCaps);
    if (planned.functionId === 'asesor-comercial') {
      assertAsesorDeniedCreateParty(finalCaps);
    }

    roles.push({
      functionId: planned.functionId,
      functionLabel: planned.functionLabel,
      intendedProfileId: planned.intendedProfileId,
      email: identity.email,
      memberId: ensured.memberId,
      personId: ensured.personId,
      authIdentityId: ensured.authId,
      supabaseUserId,
      capabilities: planned.intendedCapabilities,
      created: ensured.created || supabaseCreated,
      reused: !(ensured.created || supabaseCreated),
    });
  }

  // Password file: nine business personas only (seed actor uses ephemeral password).
  for (const email of Object.keys(passwords)) {
    if (email === WAVE2_FIXTURE_SEED_EMAIL) {
      delete passwords[email];
    }
  }
  writeFileSync(passwordPath, JSON.stringify(passwords, null, 2), { mode: 0o600 });
  chmodSync(passwordPath, 0o600);
  log(`PASSWORDS_FILE=${passwordPath}`);

  const asesor = roles.find((r) => r.functionId === 'asesor-comercial');
  if (!asesor) throw new Error('ASESOR_MISSING');
  assertAsesorDeniedCreateParty(asesor.capabilities);

  // Fixture seed actor (not a business persona): CreateParty authority only.
  const seedSpec = fixtureSeedActorSpec();
  assertCommercialSeedActorEmail(seedSpec.email);
  const seedPassword = `W2-fixture-seed-${randomBytes(12).toString('base64url')}!9`;
  const { id: seedSupabaseUserId, created: seedSupabaseCreated } = await ensureSupabaseUser(
    seedSpec.email,
    seedPassword,
  );
  const seedEnsured = await ensureOrgMemberIdentity({
    orgId: orgId,
    email: seedSpec.email,
    givenName: seedSpec.givenName,
    familyName: seedSpec.familyName,
    supabaseUserId: seedSupabaseUserId,
    workforceStore,
    prisma,
  });
  const seedCaps = await reconcileMemberScopes({
    orgId: orgId,
    memberId: seedEnsured.memberId,
    wanted: WAVE2_FIXTURE_SEED_SCOPES,
    workforceStore,
    prisma,
  });
  if (
    seedCaps.length !== WAVE2_FIXTURE_SEED_SCOPES.length ||
    !WAVE2_FIXTURE_SEED_SCOPES.every((s) => seedCaps.includes(s))
  ) {
    throw new Error(`SEED_ACTOR_SCOPE_MISMATCH:${seedCaps.join(',')}`);
  }
  const seedActor: SeedActorReceipt = {
    email: seedSpec.email,
    memberId: seedEnsured.memberId,
    personId: seedEnsured.personId,
    authIdentityId: seedEnsured.authId,
    supabaseUserId: seedSupabaseUserId,
    scopes: WAVE2_FIXTURE_SEED_SCOPES,
    purpose: 'fixture-setup-only',
    isBusinessRole: false,
    created: seedEnsured.created || seedSupabaseCreated,
    reused: !(seedEnsured.created || seedSupabaseCreated),
  };
  log(
    `SEED_ACTOR_${seedActor.reused ? 'REUSED' : 'CREATED'} member=${seedActor.memberId} scopes=${seedActor.scopes.join(',')}`,
  );

  const seedSession = ctx(
    orgId,
    seedActor.memberId,
    seedActor.personId,
    seedActor.authIdentityId,
  );
  const asesorSession = ctx(orgId, asesor.memberId, asesor.personId, asesor.authIdentityId);

  let party = await prisma.osParty.findFirst({
    where: {
      organizationId: orgId,
      legalName: WAVE2_SYNTH_PARTY_LEGAL_NAME,
    },
  });
  let partyId = party?.id;
  let opportunityId: string | null = null;
  let quoteId: string | null = null;
  let commercialCreated = false;
  let ownershipReconciled = false;

  if (!partyId) {
    // Setup authority ≠ role-under-test. Seed actor holds CreateParty only.
    const createdParty = await partySvc.execute('CreateParty', seedSession, {
      displayName: 'SYNTH Wave2 Cliente',
      partyKind: 'organization',
      legalName: WAVE2_SYNTH_PARTY_LEGAL_NAME,
      fiscalIdentity: { nit: 'W2-0000001', razonSocial: WAVE2_SYNTH_PARTY_LEGAL_NAME },
      initialRoleKey: 'customer',
      createCommercialAccount: true,
    });
    partyId = String(createdParty.data.partyId);
    log(`PARTY_CREATED partyId=${partyId} via=fixture-seed-actor`);
  } else {
    log(`PARTY_REUSED partyId=${partyId}`);
  }

  // CommercialAccount ownership → Asesor (canonical reassign; seed holds reassign scope).
  const account = await commercialStore.getCommercialAccountForParty(orgId, partyId);
  if (!account) {
    throw new Error(`SYNTH_COMMERCIAL_ACCOUNT_MISSING:${partyId}`);
  }

  let oppRow = await prisma.osOpportunity.findFirst({
    where: { organizationId: orgId, partyId },
    orderBy: { createdAt: 'asc' },
  });
  let quoteRow = await prisma.osQuote.findFirst({
    where: { organizationId: orgId, partyId },
    orderBy: { createdAt: 'asc' },
  });

  const ownershipPlan = planSynthCommercialOwnership({
    targetOwnerMemberId: asesor.memberId,
    accountOwnerMemberId: account.ownerMemberId,
    opportunityOwnerMemberId: oppRow?.ownerMemberId,
    quoteOwnerMemberId: quoteRow?.ownerMemberId,
  });

  if (ownershipPlan.reassignAccount) {
    await commercialSvc.execute('ReassignCommercialAccountOwner', seedSession, {
      commercialAccountId: account.id,
      ownerMemberId: asesor.memberId,
    });
    ownershipReconciled = true;
    log(`ACCOUNT_OWNER_REASSIGNED accountId=${account.id} owner=${asesor.memberId}`);
  }

  if (!oppRow) {
    // Asesor creates → Asesor owns (member_active; no extra Asesor seed scopes).
    const opp = await commercialSvc.execute('CreateOpportunity', asesorSession, {
      partyId,
      title: 'SYNTH Wave2 — oportunidad mínima',
      stage: 'propuesta',
      expectedValueCentavos: 150000,
    });
    opportunityId = String(opp.data.opportunityId);
    commercialCreated = true;
    log(`OPPORTUNITY_CREATED opportunityId=${opportunityId} owner=${asesor.memberId}`);
  } else {
    opportunityId = oppRow.id;
    if (ownershipPlan.assignOpportunity) {
      if (oppRow.status !== 'open') {
        throw new Error(`SYNTH_OPPORTUNITY_NOT_OPEN_FOR_OWNER_ASSIGN:${oppRow.id}:${oppRow.status}`);
      }
      if (oppRow.ownerMemberId === seedActor.memberId) {
        await commercialSvc.execute('AssignOpportunityOwner', seedSession, {
          opportunityId: oppRow.id,
          ownerMemberId: asesor.memberId,
        });
        log(`OPPORTUNITY_OWNER_ASSIGNED opportunityId=${oppRow.id} owner=${asesor.memberId}`);
      } else {
        // Prefer keep id over recreate when prior owner is neither seed nor Asesor.
        await prisma.osOpportunity.update({
          where: { id: oppRow.id },
          data: {
            ownerMemberId: asesor.memberId,
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });
        log(`OPPORTUNITY_OWNER_PATCHED opportunityId=${oppRow.id} owner=${asesor.memberId}`);
      }
      ownershipReconciled = true;
    } else {
      log(`OPPORTUNITY_REUSED opportunityId=${opportunityId}`);
    }
  }

  if (!quoteRow) {
    if (!opportunityId) throw new Error('SYNTH_OPPORTUNITY_REQUIRED_FOR_QUOTE');
    const quote = await commercialSvc.execute('CreateQuote', asesorSession, {
      partyId,
      opportunityId,
      currency: 'BOB',
      notes: 'SYNTH Wave2 quote — acceptance only',
    });
    quoteId = String(quote.data.quoteId);
    await commercialSvc.execute('AddQuoteLine', asesorSession, {
      quoteId,
      description: 'SYNTH pieza cerámica',
      quantity: 4,
      unitLabel: 'pza',
      unitPriceCentavos: 22000,
    });
    await commercialSvc.execute('SubmitQuote', asesorSession, { quoteId });
    commercialCreated = true;
    log(`QUOTE_SUBMITTED quoteId=${quoteId} owner=${asesor.memberId}`);
  } else {
    quoteId = quoteRow.id;
    if (ownershipPlan.patchQuoteOwner) {
      // No AssignQuoteOwner command — reconcile write-model owner; keep quote id.
      await prisma.osQuote.update({
        where: { id: quoteRow.id },
        data: {
          ownerMemberId: asesor.memberId,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });
      ownershipReconciled = true;
      log(`QUOTE_OWNER_PATCHED quoteId=${quoteRow.id} owner=${asesor.memberId}`);
    } else {
      log(`QUOTE_REUSED quoteId=${quoteId}`);
    }
  }

  // Refresh commercial read models so Asesor detail reads match write ownership.
  const projectionStore = new PrismaOsProjectionStore(prisma);
  const commercialConsumer = new CommercialProjectionConsumer({
    projectionStore,
    commercialStore,
  });
  const { replayed } = await replayCommercialProjectionForOrg(
    { projectionStore, commercialStore },
    orgId,
    commercialConsumer,
  );
  log(`COMMERCIAL_PROJECTION_REPLAYED events=${replayed}`);

  // Post-condition: Asesor owns account / opp / quote (no permanent FixtureSeed owner).
  const accountAfter = await commercialStore.getCommercialAccountForParty(orgId, partyId);
  oppRow = await prisma.osOpportunity.findFirst({
    where: { organizationId: orgId, id: opportunityId! },
  });
  quoteRow = await prisma.osQuote.findFirst({
    where: { organizationId: orgId, id: quoteId! },
  });
  if (!accountAfter || accountAfter.ownerMemberId !== asesor.memberId) {
    throw new Error(
      `SYNTH_ACCOUNT_OWNER_NOT_ASESOR:${accountAfter?.ownerMemberId ?? 'missing'}`,
    );
  }
  if (!oppRow || oppRow.ownerMemberId !== asesor.memberId) {
    throw new Error(`SYNTH_OPPORTUNITY_OWNER_NOT_ASESOR:${oppRow?.ownerMemberId ?? 'missing'}`);
  }
  if (!quoteRow || quoteRow.ownerMemberId !== asesor.memberId) {
    throw new Error(`SYNTH_QUOTE_OWNER_NOT_ASESOR:${quoteRow?.ownerMemberId ?? 'missing'}`);
  }
  if (seedActor.memberId === asesor.memberId) {
    throw new Error('SYNTH_SEED_ACTOR_MUST_NOT_BE_ASESOR');
  }

  const expectedCounts = expectedWave2FixtureCounts();
  if (roles.length !== expectedCounts.businessRoles) {
    throw new Error(`UNEXPECTED_BUSINESS_ROLE_COUNT:${roles.length}`);
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
    organizationId: orgId,
    organizationLegalName: WAVE2_ROLE_FIXTURE_ORG_LEGAL_NAME,
    organizationSlug: WAVE2_ROLE_FIXTURE_ORG_SLUG,
    organizationCreated: orgCreated,
    organizationReused: !orgCreated,
    expectedCounts,
    seedActor: {
      email: seedActor.email,
      memberId: seedActor.memberId,
      personId: seedActor.personId,
      authIdentityId: seedActor.authIdentityId,
      supabaseUserId: seedActor.supabaseUserId,
      scopes: [...seedActor.scopes],
      purpose: seedActor.purpose,
      isBusinessRole: false,
      created: seedActor.created,
      reused: seedActor.reused,
    },
    partyId,
    opportunityId,
    quoteId,
    orderId: null,
    productionFixtureIds: [] as string[],
    warehouseFixtureIds: [] as string[],
    purchasingFixtureIds: [] as string[],
    financeFactIds: [] as string[],
    coordinationIds: [] as string[],
    workIds: [] as string[],
    approvalIds: [] as string[],
    commercialCreated,
    commercialReused: !commercialCreated,
    commercialOwnershipReconciled: ownershipReconciled,
    commercialOwnedByMemberId: asesor.memberId,
    commercialOwnedByFunctionId: 'asesor-comercial',
    commercialSeededBy: 'fixture-seed-actor',
    commercialOwnershipNote:
      'Party via FixtureSeed; CommercialAccount reassigned to Asesor; Opp/Quote owned by Asesor (create or reconcile). FixtureSeed is never the permanent commercial owner.',
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
      'commercial.order.convert',
      'commercial.exception.authorize',
      'production.review.member',
      'people.admin',
    ],
    backlog: {
      commercialCustomerCreate:
        'PLANNED_FORWARD_UNWIRED — live CreateParty remains master_data.admin; decide CreateCustomer path or redefine scope later',
    },
    cleanupIdentifiers: {
      organizationLegalName: WAVE2_ROLE_FIXTURE_ORG_LEGAL_NAME,
      organizationSlug: WAVE2_ROLE_FIXTURE_ORG_SLUG,
      partyLegalName: WAVE2_SYNTH_PARTY_LEGAL_NAME,
      emails: [...roles.map((r) => r.email), seedActor.email],
      businessEmails: roles.map((r) => r.email),
      seedEmail: seedActor.email,
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
      organizationId: orgId,
      roleCount: roles.length,
      seedActorMemberId: seedActor.memberId,
      partyId,
      opportunityId,
      quoteId,
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
