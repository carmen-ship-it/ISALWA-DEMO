#!/usr/bin/env node
/**
 * FINAL PRE-PILOT independent hosted acceptance (mechanical).
 * SYNTH mutations only. Never prints passwords or tokens.
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const WEB = process.env.ISALWA_WEB_URL ?? 'https://os-web-staging.onrender.com';
const API = process.env.ISALWA_API_URL ?? 'https://os-api-staging.onrender.com';
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://qbpxuywtoycjpitxoblo.supabase.co';
const SYNTH = '01M2JKF77TXMJNDTKNCYNHH9G5';
const REAL = '01M2DV9F0V5DXS4G89AKF4D5SR';
const EXPECTED_SHA = process.env.FINAL_RUNTIME_SHA ?? '37a1ed7bb783b2c2ea211ce49616442884825b1c';

const secrets = join(homedir(), '.isalwa-secrets');
const OUT = join(secrets, '_verifier-pre-pilot-out');
mkdirSync(OUT, { recursive: true });

const results = [];
function record(id, status, detail) {
  results.push({ id, status, detail });
  console.log(`${status}\t${id}\t${detail}`);
}

function loadJson(name) {
  const path = join(secrets, name);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadAnonKey() {
  const path = join(secrets, 'isalwa-os-auth-staging.anon-key');
  if (!existsSync(path)) throw new Error('MISSING_ANON_KEY');
  return readFileSync(path, 'utf8').trim();
}

function loadPassword(email) {
  for (const name of [
    'isalwa-os-staging-wave-b-issue-memory-passwords.json',
    'isalwa-os-staging-wave-a-continuity-passwords.json',
    'isalwa-os-staging-wave2-role-passwords.json',
  ]) {
    const raw = loadJson(name);
    if (raw && raw[email]) return raw[email];
  }
  return null;
}

async function mint(email, anonKey) {
  const password = loadPassword(email);
  if (!password) throw new Error(`NO_PASSWORD:${email}`);
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`TOKEN:${email}:${res.status}`);
  const body = await res.json();
  return body.access_token;
}

async function api(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let parsed = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed };
}

async function main() {
  const health = await fetch(`${API}/v1/health`);
  const healthBody = await health.json();
  record('api.health', health.ok && healthBody.status === 'ok' ? 'PASS' : 'FAIL', `HTTP ${health.status}`);

  const ready = await fetch(`${API}/v1/health/ready`);
  const readyBody = await ready.json();
  record(
    'api.ready',
    ready.ok && readyBody.status === 'ready' && readyBody.runtime?.profile === 'staging' ? 'PASS' : 'FAIL',
    `profile=${readyBody.runtime?.profile} db=${readyBody.checks?.find((c) => c.name === 'database')?.ok}`,
  );

  const login = await fetch(`${WEB}/login`);
  record('web.login', login.ok ? 'PASS' : 'FAIL', `HTTP ${login.status}`);

  const inicio = await fetch(`${WEB}/inicio`, { redirect: 'manual' });
  record(
    'web.inicio.unauth',
    inicio.status === 307 || inicio.status === 302 ? 'PASS' : 'FAIL',
    `HTTP ${inicio.status}`,
  );

  const qaUnauth = await fetch(`${WEB}/sistema/pruebas-acceso`, { redirect: 'manual' });
  record(
    'qa.unauth.closed',
    qaUnauth.status === 307 || qaUnauth.status === 302 || qaUnauth.status === 404 ? 'PASS' : 'FAIL',
    `HTTP ${qaUnauth.status}`,
  );

  const anonKey = loadAnonKey();
  const asesor = await mint('w2.asesor@isalwa.demo', anonKey);
  const gerente = await mint('w2.gerente@isalwa.demo', anonKey);

  const session = await api(asesor, 'GET', '/v1/session/me');
  const orgId = session.body?.organizationId ?? session.body?.organization?.id ?? null;
  record(
    'synth.session',
    session.status === 200 && orgId === SYNTH ? 'PASS' : 'FAIL',
    `HTTP ${session.status} org=${orgId === SYNTH ? 'SYNTH' : 'OTHER_OR_MISSING'}`,
  );

  const ai = await api(asesor, 'POST', '/v1/ai/assist', {
    feature: 'ask',
    subjectType: 'issue',
    subjectId: '01NOTAREALISSUEID0000000000',
  });
  record(
    'ai.disabled.or.denied',
    ai.status === 503 || ai.status === 403 || ai.status === 404 || ai.status === 401 ? 'PASS' : 'FAIL',
    `HTTP ${ai.status} code=${ai.body?.code ?? 'none'}`,
  );

  const aiApprove = await api(asesor, 'POST', '/v1/ai/assist', {
    feature: 'approve',
    subjectType: 'issue',
    subjectId: '01NOTAREALISSUEID0000000000',
  });
  record(
    'ai.mutation.denied',
    aiApprove.status === 403 || aiApprove.status === 503 || aiApprove.status === 400 ? 'PASS' : 'FAIL',
    `HTTP ${aiApprove.status} code=${aiApprove.body?.code ?? 'none'}`,
  );

  const audit = await api(asesor, 'GET', '/v1/audit');
  record(
    'audit.operator.denied',
    audit.status === 403 || audit.status === 401 ? 'PASS' : 'FAIL',
    `HTTP ${audit.status}`,
  );

  const changes = await api(asesor, 'GET', '/v1/memory/changes?window=hoy');
  record(
    'changes.operator.denied',
    changes.status === 403 || changes.status === 401 ? 'PASS' : 'FAIL',
    `HTTP ${changes.status}`,
  );

  const issues = await api(asesor, 'GET', '/v1/issues?view=open');
  record('issues.synth.read', issues.status === 200 ? 'PASS' : 'FAIL', `HTTP ${issues.status}`);

  const commitments = await api(asesor, 'GET', '/v1/commitments');
  record(
    'commitments.synth.read',
    commitments.status === 200 || commitments.status === 403 ? 'PASS' : 'FAIL',
    `HTTP ${commitments.status}`,
  );

  const parties = await api(asesor, 'GET', '/v1/parties?status=active&limit=20');
  const partyItems = parties.body?.items ?? parties.body ?? [];
  const partyList = Array.isArray(partyItems) ? partyItems : [];
  record(
    'parties.synth.read',
    parties.status === 200 ? 'PASS' : 'FAIL',
    `HTTP ${parties.status} count=${partyList.length}`,
  );

  // Cross-tenant: SYNTH token must not read REAL org implicitly.
  const cross = await api(asesor, 'GET', `/v1/parties?organizationId=${REAL}`);
  const leaked =
    JSON.stringify(cross.body ?? {}).includes(REAL) &&
    Array.isArray(cross.body?.items) &&
    cross.body.items.length > 0;
  record(
    'cross.tenant.party',
    !leaked && (cross.status === 200 || cross.status === 400 || cross.status === 403) ? 'PASS' : 'FAIL',
    `HTTP ${cross.status} leaked=${leaked}`,
  );

  const gerenteSession = await api(gerente, 'GET', '/v1/session/me');
  record(
    'gerente.session',
    gerenteSession.status === 200 ? 'PASS' : 'FAIL',
    `HTTP ${gerenteSession.status}`,
  );

  const gerenteChanges = await api(gerente, 'GET', '/v1/memory/changes?window=hoy');
  record(
    'changes.gerente',
    [200, 403].includes(gerenteChanges.status) ? 'PASS' : 'FAIL',
    `HTTP ${gerenteChanges.status} items=${gerenteChanges.body?.items?.length ?? 'n/a'}`,
  );

  const qaGet = await api(asesor, 'GET', '/v1/qa/effective-access?memberId=01NOTAREALMEMBER000000000');
  record(
    'qa.api.operator.without.qa.access',
    qaGet.status === 403 || qaGet.status === 404 || qaGet.status === 401 ? 'PASS' : 'FAIL',
    `HTTP ${qaGet.status}`,
  );

  const fail = results.filter((r) => r.status === 'FAIL');
  const summary = {
    expectedSha: EXPECTED_SHA,
    pass: results.filter((r) => r.status === 'PASS').length,
    fail: fail.length,
    results,
  };
  writeFileSync(join(OUT, 'pre-pilot-hosted-accept.json'), JSON.stringify(summary, null, 2));
  console.log(`SUMMARY\tpass=${summary.pass}\tfail=${summary.fail}`);
  if (fail.length) process.exit(2);
}

main().catch((err) => {
  console.error('VERIFIER_CRASH', err instanceof Error ? err.message : 'unknown');
  process.exit(1);
});
