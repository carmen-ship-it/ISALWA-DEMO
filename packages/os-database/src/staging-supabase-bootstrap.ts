/**
 * Staging-only first-admin + synthetic commercial bootstrap (operator CLI).
 *
 * Creates: Supabase user → AuthIdentity(provider=supabase) → Person → active
 * OrganizationMember → roles → synthetic customer/opportunity/quote.
 *
 * NOT a public HTTP endpoint. NOT Step17 local-dev auth.
 * Never logs passwords, JWTs, or service-role keys.
 *
 * Required env:
 *   OS_DATABASE_URL
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 * Optional:
 *   STAGING_ADMIN_EMAIL (default: carmen staging email)
 *   STAGING_ADMIN_PASSWORD (generated if unset; written to ~/.isalwa-secrets)
 *   STAGING_BOOTSTRAP_ALLOW_EXISTING=1 to no-op when org already present
 */
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createId } from '@isalwa/ts-utils';
import type { RequestContext } from '@isalwa/os-contracts';
import { PartyCommandService } from '@isalwa/os-party';
import { CommercialCommandService } from '@isalwa/os-commercial';
import { getOsPrisma } from './client';
import { PrismaOsWorkforceStore } from './prisma-workforce-store';
import { PrismaOsPartyStore } from './prisma-party-store';
import { PrismaOsCommercialStore } from './prisma-commercial-store';

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`MISSING_ENV:${name}`);
  return v;
}

function log(line: string): void {
  const safe = line
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT_REDACTED]');
  // eslint-disable-next-line no-console
  console.log(safe);
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = requireEnv('SUPABASE_URL').replace(/\/$/, '');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
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
  const list = await adminFetch(`/auth/v1/admin/users?page=1&per_page=200`);
  if (!list.ok) throw new Error(`ADMIN_LIST_USERS_FAILED:${list.status}`);
  const body = (await list.json()) as { users?: Array<{ id: string; email?: string }> };
  const existing = (body.users ?? []).find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
  if (existing?.id) {
    log(`SUPABASE_USER_EXISTS id=${existing.id}`);
    return existing.id;
  }
  const res = await adminFetch('/auth/v1/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`ADMIN_CREATE_USER_FAILED:${res.status}`);
  const created = (await res.json()) as { id: string };
  log(`SUPABASE_USER_CREATED id=${created.id}`);
  return created.id;
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

async function main(): Promise<void> {
  requireEnv('OS_DATABASE_URL');
  const supabaseUrl = requireEnv('SUPABASE_URL');
  requireEnv('SUPABASE_ANON_KEY');
  requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  if (projectRef !== 'qbpxuywtoycjpitxoblo') {
    throw new Error(`UNEXPECTED_SUPABASE_PROJECT_REF:${projectRef}`);
  }

  const adminEmail =
    process.env.STAGING_ADMIN_EMAIL?.trim() || 'carmen.staging@isalwa.demo';
  const secretsDir = join(homedir(), '.isalwa-secrets');
  mkdirSync(secretsDir, { recursive: true });
  const passwordPath = join(secretsDir, 'isalwa-os-staging-admin.password');
  let adminPassword = process.env.STAGING_ADMIN_PASSWORD?.trim();
  if (!adminPassword) {
    adminPassword = `Isalwa-Stg-${randomBytes(18).toString('base64url')}!9`;
    writeFileSync(passwordPath, adminPassword, { mode: 0o600 });
    chmodSync(passwordPath, 0o600);
    log(`ADMIN_PASSWORD_FILE=${passwordPath}`);
  } else {
    log('ADMIN_PASSWORD=from_env');
  }

  const prisma = getOsPrisma();
  if (!prisma) throw new Error('OS_DATABASE_URL prisma unavailable');

  const orgCount = await prisma.osOrganization.count();
  if (orgCount > 0 && process.env.STAGING_BOOTSTRAP_ALLOW_EXISTING !== '1') {
    throw new Error('STAGING_ALREADY_BOOTSTRAPPED — set STAGING_BOOTSTRAP_ALLOW_EXISTING=1 to no-op');
  }
  if (orgCount > 0) {
    log('BOOTSTRAP_SKIPPED existing org present');
    return;
  }

  const workforceStore = new PrismaOsWorkforceStore(prisma);
  const partyStore = new PrismaOsPartyStore(prisma);
  const commercialStore = new PrismaOsCommercialStore(prisma);
  const partySvc = new PartyCommandService(partyStore);
  const commercialSvc = new CommercialCommandService(commercialStore);

  const org = await workforceStore.seedOrganization(
    'ISALWA Staging S.R.L.',
    `isalwa-stg-${createId().slice(0, 8)}`,
  );
  log(`ORG_CREATED id=${org.id}`);

  const supabaseUserId = await ensureSupabaseUser(adminEmail, adminPassword);

  const personId = randomUUID();
  const memberId = randomUUID();
  const authId = randomUUID();
  await workforceStore.insertPerson({
    id: personId,
    givenName: 'Carmen',
    familyName: 'Staging',
    version: 0,
  });
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
    email: adminEmail,
    status: 'active',
    invitedAt: null,
    activatedAt: new Date(),
    revokedAt: null,
  });
  for (const roleKey of ['people.admin', 'master_data.admin'] as const) {
    await workforceStore.insertRoleAssignment({
      id: randomUUID(),
      organizationId: org.id,
      memberId,
      roleKey,
      effectiveAt: new Date('2020-01-01'),
      endedAt: null,
    });
  }
  log(`ADMIN_MEMBER_CREATED memberId=${memberId} email=${adminEmail}`);

  // Synthetic sales member (Equipo) — local-only identity for directory; invite later for real login
  const maria = await workforceStore.seedScopedAdminMember(
    org.id,
    `maria.quispe.stg-${createId().slice(0, 6)}@isalwa.demo`,
    'María',
    'Quispe',
    'sales_rep',
  );
  log(`SYNTHETIC_MEMBER_CREATED memberId=${maria.member.id}`);

  const session = ctx(org.id, memberId, personId, authId);
  const party = await partySvc.execute('CreateParty', session, {
    displayName: 'Cliente Step17 S.A.',
    partyKind: 'organization',
    legalName: 'Cliente Step17 S.A.',
    fiscalIdentity: { nit: '987654321', razonSocial: 'Cliente Step17 S.A.' },
    initialRoleKey: 'customer',
    createCommercialAccount: true,
  });
  const partyId = String(party.data.partyId);
  log(`PARTY_CREATED partyId=${partyId}`);

  await partySvc.execute('UpdateContact', session, {
    organizationPartyId: partyId,
    givenName: 'Ana',
    familyName: 'Mercado',
    phone: '+59170011223',
    title: 'Compras',
  });

  const opp = await commercialSvc.execute('CreateOpportunity', session, {
    partyId,
    title: 'Reposición sanitarios — El Alto',
    stage: 'propuesta',
    expectedValueCentavos: 385000,
  });
  const opportunityId = String(opp.data.opportunityId);
  log(`OPPORTUNITY_CREATED opportunityId=${opportunityId}`);

  const quote = await commercialSvc.execute('CreateQuote', session, {
    partyId,
    opportunityId,
    currency: 'BOB',
    notes: 'Cotización sintética de staging',
  });
  const quoteId = String(quote.data.quoteId);
  await commercialSvc.execute('AddQuoteLine', session, {
    quoteId,
    description: 'Lavamanos cerámico blanco',
    quantity: 10,
    unitLabel: 'pza',
    unitPriceCentavos: 18500,
  });
  await commercialSvc.execute('AddQuoteLine', session, {
    quoteId,
    description: 'Inodoro tanque bajo',
    quantity: 8,
    unitLabel: 'pza',
    unitPriceCentavos: 25000,
  });
  await commercialSvc.execute('SubmitQuote', session, { quoteId });
  log(`QUOTE_SUBMITTED quoteId=${quoteId}`);

  // Verify password sign-in works against Auth project (no token logged)
  const supabase = createClient(supabaseUrl, requireEnv('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (error || !data.session?.access_token || !data.user?.id) {
    throw new Error(`SIGNIN_VERIFY_FAILED:${error?.message ?? 'no session'}`);
  }
  const fp = createHash('sha256').update(data.session.access_token).digest('hex').slice(0, 12);
  log(`SIGNIN_VERIFY_PASS jwt_fp=${fp} user=${data.user.id}`);

  log(
    JSON.stringify({
      ok: true,
      organizationId: org.id,
      adminMemberId: memberId,
      adminEmail,
      partyId,
      opportunityId,
      quoteId,
      supabaseProjectRef: projectRef,
    }),
  );
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
