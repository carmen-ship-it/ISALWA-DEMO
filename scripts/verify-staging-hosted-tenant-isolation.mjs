#!/usr/bin/env node
/**
 * Hosted staging: cross-tenant isolation + auth negative regression.
 * Uses Carmen Supabase password grant + Tenant B fixture IDs.
 * Never prints tokens or passwords.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const API = process.env.OS_API_STAGING_URL ?? 'https://os-api-staging.onrender.com';
const SUPABASE_URL = 'https://qbpxuywtoycjpitxoblo.supabase.co';
const secrets = join(homedir(), '.isalwa-secrets');

function readSecret(name) {
  return readFileSync(join(secrets, name), 'utf8').trim();
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const fixture = JSON.parse(
    readFileSync(join(secrets, 'isalwa-os-staging-isolation-fixture.json'), 'utf8'),
  );
  assert(fixture.partyId && fixture.quoteId && fixture.organizationId, 'fixture incomplete');

  const results = [];

  // --- Auth negative regression ---
  {
    const r = await fetch(`${API}/v1/members`);
    results.push(['unauth_members', r.status, r.status === 401]);
  }
  {
    const r = await fetch(`${API}/v1/attention?limit=1`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.sig' },
    });
    results.push(['invalid_jwt', r.status, r.status === 401]);
  }
  {
    const r = await fetch(`${API}/v1/attention?limit=1`, {
      headers: {
        'x-os-organization-id': 'fake',
        'x-os-member-id': 'fake',
        'x-os-person-id': 'fake',
        'x-os-auth-identity-id': 'fake',
      },
    });
    results.push(['dev_headers', r.status, r.status === 401]);
  }
  {
    const r = await fetch(`${API}/v1/dev/bootstrap`, { method: 'POST' });
    results.push(['dev_bootstrap', r.status, r.status === 404]);
  }
  {
    const r = await fetch(`${API}/v1/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example',
        'Access-Control-Request-Method': 'GET',
      },
    });
    const acao = r.headers.get('access-control-allow-origin');
    results.push(['cors_wrong_origin', r.status, !acao]);
  }
  {
    const r = await fetch(`${API}/v1/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://os-web-staging.onrender.com',
        'Access-Control-Request-Method': 'GET',
      },
    });
    const acao = r.headers.get('access-control-allow-origin');
    results.push([
      'cors_right_origin',
      r.status,
      acao === 'https://os-web-staging.onrender.com',
    ]);
  }

  // --- Carmen JWT (Tenant A) ---
  const email = 'carmen.staging@isalwa.demo';
  const password = readSecret('isalwa-os-staging-admin.password');
  const anon = readSecret('isalwa-os-auth-staging.anon-key');
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const tokenBody = await tokenRes.json();
  assert(tokenRes.ok && tokenBody.access_token, `signin_failed:${tokenRes.status}`);
  const token = tokenBody.access_token;
  const auth = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

  {
    const r = await fetch(`${API}/v1/attention?limit=1`, { headers: auth });
    results.push(['carmen_attention', r.status, r.status === 200]);
  }

  // Cross-tenant reads — expect 404 fail-closed (no existence leak of foreign tenant)
  for (const [label, path] of [
    ['cross_party', `/v1/parties/${fixture.partyId}`],
    ['cross_quote', `/v1/quotes/${fixture.quoteId}`],
    ['cross_opportunity', `/v1/opportunities/${fixture.opportunityId}`],
    ['cross_member', `/v1/members/${fixture.memberId}`],
  ]) {
    const r = await fetch(`${API}${path}`, { headers: auth });
    let body = '';
    try {
      body = await r.text();
    } catch {
      body = '';
    }
    const leak =
      body.includes(fixture.organizationId) ||
      body.includes('Isolation Customer') ||
      body.includes('ISOLATION Tenant B');
    results.push([label, r.status, r.status === 404 && !leak]);
    results.push([`${label}_no_leak`, leak ? 1 : 0, !leak]);
  }

  // Caller-controlled org hint for Tenant B must not grant access
  {
    const r = await fetch(`${API}/v1/parties/${fixture.partyId}`, {
      headers: { ...auth, 'x-os-organization-id': fixture.organizationId },
    });
    results.push([
      'org_hint_spoof',
      r.status,
      r.status === 403 || r.status === 401 || r.status === 404,
    ]);
  }

  // Cross-tenant write attempt (UpdateOpportunity on B) — fail closed
  {
    const r = await fetch(`${API}/v1/commands/UpdateOpportunity`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opportunityId: fixture.opportunityId,
        title: 'should-not-apply',
      }),
    });
    let body = '';
    try {
      body = await r.text();
    } catch {
      body = '';
    }
    const ok =
      (r.status === 404 || r.status === 403 || r.status === 400) &&
      !body.includes('Isolation Customer');
    results.push(['cross_write_update_opp', r.status, ok]);
  }

  const failed = results.filter(([, , pass]) => !pass);
  for (const [name, status, pass] of results) {
    console.log(`${pass ? 'PASS' : 'FAIL'} ${name} status=${status}`);
  }
  if (failed.length) {
    console.error(JSON.stringify({ ok: false, failed: failed.map(([n, s]) => ({ n, s })) }));
    process.exit(1);
  }
  console.log(
    JSON.stringify({
      ok: true,
      tenantBOrganizationId: fixture.organizationId,
      checks: results.length,
    }),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
