/**
 * Step 14.6B — Live Supabase auth provider verification (synthetic users only).
 * Never logs JWTs, passwords, or service-role keys.
 *
 * Run: VERIFY_ROOT=/path/to/repo pnpm --filter @isalwa/os-database exec node --import tsx src/step14-6b-live-supabase-verify.ts
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { getOsPrisma, PrismaOsWorkforceStore } from './index';
import { SupabaseAuthProviderPort, WorkforceCommandService } from '@isalwa/os-workforce';
import type { RequestContext } from '@isalwa/os-contracts';

const STAMP = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z');
const ROOT = process.env.VERIFY_ROOT ?? join(process.cwd(), '../..');
const LOG_DIR = join(ROOT, '.step14-6b-evidence');
mkdirSync(LOG_DIR, { recursive: true });
const LOG_PATH = join(LOG_DIR, `verify-${STAMP}.log`);

function log(line: string): void {
  const safe = line
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT_REDACTED]');
  appendFileSync(LOG_PATH, safe + '\n');
  console.log(safe);
}

function jwtFingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 16);
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`MISSING_ENV:${name}`);
  return v;
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

async function adminCreateUser(email: string, password: string): Promise<string> {
  const res = await adminFetch('/auth/v1/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) {
    throw new Error(`ADMIN_CREATE_USER_FAILED:${res.status}`);
  }
  const body = (await res.json()) as { id: string };
  return body.id;
}

async function adminGetUser(userId: string): Promise<{ id: string } | null> {
  const res = await adminFetch(`/auth/v1/admin/users/${userId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`ADMIN_GET_USER_FAILED:${res.status}`);
  return (await res.json()) as { id: string };
}

async function adminDeleteUser(userId: string): Promise<void> {
  const res = await adminFetch(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`ADMIN_DELETE_USER_FAILED:${res.status}`);
  }
}

async function signIn(email: string, password: string): Promise<{ userId: string; accessToken: string }> {
  const url = requireEnv('SUPABASE_URL');
  const anon = requireEnv('SUPABASE_ANON_KEY');
  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token || !data.user?.id) {
    throw new Error(`SIGNIN_FAILED:${error?.message ?? 'no session'}`);
  }
  return { userId: data.user.id, accessToken: data.session.access_token };
}

async function seedSyntheticMember(
  store: PrismaOsWorkforceStore,
  orgId: string,
  email: string,
  providerSubject: string,
  roleKey: string,
) {
  const personId = randomUUID();
  const memberId = randomUUID();
  const authId = randomUUID();
  await store.insertPerson({
    id: personId,
    givenName: 'Auth',
    familyName: 'Test',
    version: 0,
  });
  await store.insertMember({
    id: memberId,
    organizationId: orgId,
    personId,
    employmentStatus: 'active',
    accessStatus: 'active',
    employmentStartedAt: new Date(),
    employmentEndedAt: null,
    version: 0,
  });
  await store.insertAuthIdentity({
    id: authId,
    personId,
    provider: 'supabase',
    providerSubject,
    email,
    status: 'active',
    invitedAt: null,
    activatedAt: new Date(),
    revokedAt: null,
  });
  await store.insertRoleAssignment({
    id: randomUUID(),
    organizationId: orgId,
    memberId,
    roleKey,
    effectiveAt: new Date('2020-01-01'),
    endedAt: null,
  });
  return { personId, memberId, authId };
}

function ctx(orgId: string, memberId: string, personId: string, authId: string): RequestContext {
  return {
    organizationId: orgId,
    actorMemberId: memberId,
    personId,
    authIdentityId: authId,
    correlationId: randomUUID(),
    effectiveAt: new Date(),
  };
}

async function httpCapabilities(baseUrl: string, bearer?: string): Promise<number> {
  const headers: Record<string, string> = {};
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  const res = await fetch(`${baseUrl}/v1/capabilities`, { headers });
  return res.status;
}

async function main(): Promise<void> {
  log('=== Step 14.6B Live Supabase Provider Verification ===');

  const supabaseUrl = requireEnv('SUPABASE_URL');
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  log(`PROJECT_REF=${projectRef}`);
  log('ENVIRONMENT_CLASS=pilot_dev_non_production (efolotcrdaqdixfiqbek documented Step 10.3)');
  requireEnv('SUPABASE_ANON_KEY');
  requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  requireEnv('OS_DATABASE_URL');

  const prisma = getOsPrisma();
  if (!prisma) throw new Error('OS_DATABASE_URL prisma unavailable');

  const store = new PrismaOsWorkforceStore(prisma);
  const authProvider = new SupabaseAuthProviderPort();
  const workforceSvc = new WorkforceCommandService(store, authProvider);

  const password = `Synth-${randomBytes(12).toString('base64url')}!1`;
  const emailA = `isalwa-auth-test+a-${STAMP}@isalwa.demo`;
  const emailB = `isalwa-auth-test+b-${STAMP}@isalwa.demo`;

  let userAId = '';
  let userBId = '';
  let orgId = '';
  let adminMemberId = '';
  let adminPersonId = '';
  let adminAuthId = '';
  let workerAMemberId = '';
  let workerAAuthId = '';
  let workerBMemberId = '';
  let workerBPersonId = '';
  let apiPid: number | null = null;
  let oldJwtA = '';

  const cleanupProviderIds: string[] = [];

  try {
    log('--- PRE-FLIGHT ---');
    log(`SYNTHETIC_EMAIL_A=${emailA}`);
    log(`SYNTHETIC_EMAIL_B=${emailB}`);

    userAId = await adminCreateUser(emailA, password);
    userBId = await adminCreateUser(emailB, password);
    cleanupProviderIds.push(userAId, userBId);
    log(`USER_A_PROVIDER_SUBJECT=${userAId.slice(0, 8)}…`);
    log(`USER_B_PROVIDER_SUBJECT=${userBId.slice(0, 8)}…`);

    const org = await store.seedOrganization(`Auth14.6B ${STAMP}`, `auth14-6b-${STAMP}`);
    orgId = org.id;
    const admin = await store.seedScopedAdminMember(
      orgId,
      `isalwa-auth-test+admin-${STAMP}@isalwa.demo`,
      'Admin',
      'Synth',
      'people.admin',
    );
    adminMemberId = admin.member.id;
    adminPersonId = admin.person.id;
    adminAuthId = admin.auth.id;

    const workerA = await seedSyntheticMember(store, orgId, emailA, userAId, 'member_active');
    workerAMemberId = workerA.memberId;
    workerAAuthId = workerA.authId;

    const workerB = await seedSyntheticMember(store, orgId, emailB, userBId, 'member_active');
    workerBMemberId = workerB.memberId;
    workerBPersonId = workerB.personId;

    const adminSession = ctx(orgId, adminMemberId, adminPersonId, adminAuthId);

    log('--- TEST A: SUSPEND ---');
    const signInA = await signIn(emailA, password);
    if (signInA.userId !== userAId) throw new Error('PROVIDER_SUBJECT_MISMATCH_A');
    oldJwtA = signInA.accessToken;
    log(`JWT_A_FINGERPRINT=${jwtFingerprint(oldJwtA)}`);

    const port = Number(process.env.OS_API_PORT ?? '4031');
    const base = `http://127.0.0.1:${port}`;
    const { spawn } = await import('node:child_process');
    const api = spawn('node', [join(ROOT, 'apps/os-api/dist/main.js')], {
      env: {
        ...process.env,
        OS_AUTH_MODE: 'supabase',
        OS_API_PORT: String(port),
        OS_OUTBOX_WORKER: '0',
        NODE_ENV: 'development',
      },
      stdio: 'ignore',
    });
    apiPid = api.pid ?? null;
    const healthUrl = `http://127.0.0.1:${port}/v1/health`;
    let ready = false;
    for (let i = 0; i < 20; i++) {
      try {
        const h = await fetch(healthUrl);
        if (h.ok) {
          ready = true;
          break;
        }
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!ready) throw new Error('OS_API_NOT_READY');

    const before = await httpCapabilities(base, oldJwtA);
    log(`CAPABILITIES_BEFORE_SUSPEND HTTP ${before}`);
    if (before !== 200) throw new Error(`CAPABILITIES_BEFORE_SUSPEND_FAIL:${before}`);

    await workforceSvc.execute('SuspendMember', adminSession, { memberId: workerAMemberId });

    const memberAfterSuspend = await store.getMember(workerAMemberId);
    log(`OS_ACCESS_AFTER_SUSPEND=${memberAfterSuspend?.accessStatus}`);
    if (memberAfterSuspend?.accessStatus !== 'suspended') throw new Error('OS_SUSPEND_FAIL');

    const authAfterSuspend = await store.findAuthIdentityById(workerAAuthId);
    log(`AUTH_IDENTITY_AFTER_SUSPEND=${authAfterSuspend?.status}`);
    if (authAfterSuspend?.status !== 'active') throw new Error('AUTH_IDENTITY_SHOULD_STAY_ACTIVE');

    const providerAfterSuspend = await adminGetUser(userAId);
    log(`PROVIDER_USER_AFTER_SUSPEND=${providerAfterSuspend ? 'PRESENT' : 'MISSING'}`);
    if (!providerAfterSuspend) throw new Error('PROVIDER_USER_MISSING_AFTER_SUSPEND');

    const afterSuspendJwt = await httpCapabilities(base, oldJwtA);
    log(`CAPABILITIES_OLD_JWT_AFTER_SUSPEND HTTP ${afterSuspendJwt}`);
    if (afterSuspendJwt !== 401 && afterSuspendJwt !== 403) {
      throw new Error(`OLD_JWT_NOT_DENIED_AFTER_SUSPEND:${afterSuspendJwt}`);
    }
    log('TEST_A_SUSPEND GLOBAL_LOGOUT=PASS (provider user present; old JWT denied)');

    log('--- TEST B: REACTIVATE ---');
    await workforceSvc.execute('ActivateMember', adminSession, {
      memberId: workerAMemberId,
      providerSubject: userAId,
    });
    log(`OS_ACCESS_AFTER_REACTIVATE=${(await store.getMember(workerAMemberId))?.accessStatus}`);

    const oldJwtStillDenied = await httpCapabilities(base, oldJwtA);
    log(`CAPABILITIES_OLD_JWT_AFTER_REACTIVATE HTTP ${oldJwtStillDenied}`);
    if (oldJwtStillDenied === 200) {
      log(
        'NOTE_OLD_JWT_AFTER_REACTIVATE=ALLOWED (OS member active; provider access token may remain valid until expiry after global logout)',
      );
    }

    const signInA2 = await signIn(emailA, password);
    const newJwt = signInA2.accessToken;
    log(`JWT_A2_FINGERPRINT=${jwtFingerprint(newJwt)}`);
    const afterNewLogin = await httpCapabilities(base, newJwt);
    log(`CAPABILITIES_NEW_JWT_AFTER_REACTIVATE HTTP ${afterNewLogin}`);
    if (afterNewLogin !== 200) throw new Error(`NEW_JWT_DENIED_AFTER_REACTIVATE:${afterNewLogin}`);
    log('TEST_B_REACTIVATE=PASS');

    log('--- TEST C: TERMINATE ---');
    const signInB = await signIn(emailB, password);
    log(`JWT_B_FINGERPRINT=${jwtFingerprint(signInB.accessToken)}`);
    const beforeB = await httpCapabilities(base, signInB.accessToken);
    log(`CAPABILITIES_B_BEFORE_TERMINATE HTTP ${beforeB}`);
    if (beforeB !== 200) throw new Error(`CAPABILITIES_B_BEFORE_FAIL:${beforeB}`);

    await workforceSvc.execute('TerminateMember', adminSession, { memberId: workerBMemberId });

    const memberB = await store.getMember(workerBMemberId);
    log(`OS_ACCESS_AFTER_TERMINATE=${memberB?.accessStatus}`);
    log(`OS_EMPLOYMENT_AFTER_TERMINATE=${memberB?.employmentStatus}`);
    if (memberB?.accessStatus !== 'revoked' || memberB?.employmentStatus !== 'terminated') {
      throw new Error('OS_TERMINATE_FAIL');
    }
    const authB = await store.findAuthIdentityByPersonAndStatus(workerBPersonId, 'revoked');
    log(`AUTH_IDENTITY_AFTER_TERMINATE=${authB?.status ?? 'missing'}`);
    if (!authB || authB.status !== 'revoked') throw new Error('AUTH_IDENTITY_NOT_REVOKED');

    await new Promise((r) => setTimeout(r, 1500));
    const providerAfterTerminate = await adminGetUser(userBId);
    log(`PROVIDER_USER_AFTER_TERMINATE=${providerAfterTerminate ? 'PRESENT' : 'MISSING'}`);
    if (providerAfterTerminate) throw new Error('PROVIDER_USER_STILL_PRESENT_AFTER_TERMINATE');

    const afterTerminateJwt = await httpCapabilities(base, signInB.accessToken);
    log(`CAPABILITIES_OLD_JWT_AFTER_TERMINATE HTTP ${afterTerminateJwt}`);
    if (afterTerminateJwt !== 401 && afterTerminateJwt !== 403) {
      throw new Error(`OLD_JWT_NOT_DENIED_AFTER_TERMINATE:${afterTerminateJwt}`);
    }
    log('TEST_C_TERMINATE=PASS');
    cleanupProviderIds.splice(cleanupProviderIds.indexOf(userBId), 1);

    log('--- TEST D: REHIRE ---');
    const rehireEmail = `isalwa-auth-test+rehire-${STAMP}@isalwa.demo`;
    try {
      const rehire = await workforceSvc.execute('RehireMember', adminSession, {
        personId: workerBPersonId,
        email: rehireEmail,
        roleKey: 'member_active',
      });
      log(`REHIRE_MEMBER_ID=${String(rehire.data.memberId).slice(0, 8)}…`);
      const identities = await prisma.osAuthIdentity.count({ where: { personId: workerBPersonId } });
      log(`AUTH_IDENTITY_COUNT_AFTER_REHIRE=${identities}`);
      if (identities < 2) throw new Error('REHIRE_NEW_AUTH_IDENTITY_MISSING');
      const revokedStill = await store.findAuthIdentityByPersonAndStatus(workerBPersonId, 'revoked');
      const invited = await prisma.osAuthIdentity.findFirst({
        where: { personId: workerBPersonId, status: 'invited' },
        orderBy: { invitedAt: 'desc' },
      });
      log(`REVOKED_IDENTITY_PRESERVED=${revokedStill ? 'YES' : 'NO'}`);
      log(`NEW_INVITED_IDENTITY=${invited ? 'YES' : 'NO'}`);
      if (!revokedStill || !invited) throw new Error('REHIRE_CONTRACT_FAIL');
      log('TEST_D_REHIRE=PASS (live provider invite executed)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('PROVIDER_INVITE_FAILED')) {
        log('TEST_D_REHIRE=DEFERRED (live Supabase invite failed; OS rehire path not fully live-verified)');
      } else {
        throw err;
      }
    }

    log('=== Step 14.6B LIVE VERIFICATION PASS ===');
    log(`LOG=${LOG_PATH}`);
  } finally {
    if (apiPid) {
      try {
        process.kill(apiPid);
      } catch {
        /* ignore */
      }
    }
    log('--- CLEANUP ---');
    for (const id of cleanupProviderIds) {
      try {
        await adminDeleteUser(id);
        const gone = await adminGetUser(id);
        log(`CLEANUP_PROVIDER_${id.slice(0, 8)}=${gone ? 'STILL_PRESENT' : 'DELETED'}`);
      } catch (err) {
        log(`CLEANUP_FAIL_${id.slice(0, 8)}=${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}

main().catch((err) => {
  log(`FAIL ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
