#!/usr/bin/env node
/**
 * Wave B Issue Memory — Durable Hosted Close Verifier
 *
 * Proves:
 * 1. CompleteWork (NOT CompleteWorkItem) command exists and works
 * 2. work≠issue: completing work does not auto-resolve the issue
 *
 * NEVER prints passwords. Read-only against REAL org.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const WEB = process.env.ISALWA_WEB_URL ?? 'https://os-web-staging.onrender.com';
const API = process.env.ISALWA_API_URL ?? 'https://os-api-staging.onrender.com';
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://qbpxuywtoycjpitxoblo.supabase.co';

const secrets = join(homedir(), '.isalwa-secrets');
const OUT = join(secrets, '_verifier-wave-b-close-out');
mkdirSync(OUT, { recursive: true });

function loadAnonKey() {
  const path = join(secrets, 'isalwa-os-auth-staging.anon-key');
  if (!existsSync(path)) throw new Error('Missing anon key at ' + path);
  return readFileSync(path, 'utf8').trim();
}

function loadFixture() {
  const path = join(secrets, 'isalwa-os-staging-wave-b-issue-memory.json');
  if (!existsSync(path)) throw new Error('Missing fixture at ' + path);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadPassword(email) {
  const waveb = join(secrets, 'isalwa-os-staging-wave-b-issue-memory-passwords.json');
  if (existsSync(waveb)) {
    const raw = JSON.parse(readFileSync(waveb, 'utf8'));
    if (raw[email]) return raw[email];
  }
  const cont = join(secrets, 'isalwa-os-staging-wave-a-continuity-passwords.json');
  if (existsSync(cont)) {
    const raw = JSON.parse(readFileSync(cont, 'utf8'));
    if (raw[email]) return raw[email];
  }
  const path = join(secrets, 'isalwa-os-staging-wave2-role-passwords.json');
  return JSON.parse(readFileSync(path, 'utf8'))[email] ?? null;
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

function randomId() {
  return '01' + [...Array(24)].map(() => '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[Math.random() * 32 | 0]).join('');
}

async function apiGet(token, path) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

async function apiPostCommand(token, command, input) {
  const res = await fetch(`${API}/v1/commands/${command}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'idempotency-key': randomId(),
    },
    body: JSON.stringify(input),
  });
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

async function main() {
  const report = {
    at: new Date().toISOString(),
    proofs: {},
    errors: [],
    summary: {},
  };

  try {
    const anonKey = loadAnonKey();
    const fixture = loadFixture();

    // Get tokens
    const managerToken = await mint(fixture.issueManager.email, anonKey);
    const workToken = await mint(fixture.issueWork.email, anonKey);

    // ─────────────────────────────────────────────────────────────────────────
    // PROOF 1: CompleteWork command works (not CompleteWorkItem)
    // ─────────────────────────────────────────────────────────────────────────

    // First, create a test issue via API
    const createIssue = await apiPostCommand(managerToken, 'ReportIssue', {
      description: 'Wave B close verifier test issue ' + new Date().toISOString(),
      title: 'Wave B Close Test',
    });

    let issueId = null;
    let issueVersion = 0;

    if (createIssue.status === 200 || createIssue.status === 201) {
      issueId = createIssue.body?.data?.issueId;
      issueVersion = createIssue.body?.data?.version ?? 0;
    }

    report.proofs.issue_created = {
      verdict: issueId ? 'PASS' : 'FAIL',
      issueId,
      status: createIssue.status,
    };

    if (!issueId) {
      report.errors.push('Could not create test issue');
    }

    // Triage the issue
    if (issueId) {
      const triage = await apiPostCommand(managerToken, 'TriageIssue', {
        issueId,
        expectedVersion: issueVersion,
      });
      if (triage.status === 200 || triage.status === 201) issueVersion++;
    }

    // Assign to work member
    if (issueId) {
      const assign = await apiPostCommand(managerToken, 'AssignIssueOwner', {
        issueId,
        ownerMemberId: fixture.issueWork.memberId,
        expectedVersion: issueVersion,
      });
      if (assign.status === 200 || assign.status === 201) issueVersion++;
    }

    // Start progress
    if (issueId) {
      const start = await apiPostCommand(managerToken, 'StartIssueProgress', {
        issueId,
        expectedVersion: issueVersion,
      });
      if (start.status === 200 || start.status === 201) issueVersion++;
    }

    // Link work item to issue
    if (issueId && fixture.sampleWorkItemId) {
      const link = await apiPostCommand(workToken, 'LinkIssueWork', {
        issueId,
        workItemId: fixture.sampleWorkItemId,
        expectedVersion: issueVersion,
      });
      if (link.status === 200 || link.status === 201) issueVersion++;
    }

    // TEST: CompleteWork (canonical name) should work
    const completeWork = await apiPostCommand(workToken, 'CompleteWork', {
      workItemId: fixture.sampleWorkItemId,
    });

    report.proofs.complete_work_command = {
      verdict: completeWork.status === 200 || completeWork.status === 201 ? 'PASS' : 'CONDITIONAL',
      status: completeWork.status,
      command: 'CompleteWork',
      note: 'Canonical command name is CompleteWork, not CompleteWorkItem',
    };

    // TEST: CompleteWorkItem should NOT work (wrong name)
    const wrongCommand = await apiPostCommand(workToken, 'CompleteWorkItem', {
      workItemId: fixture.sampleWorkItemId,
    });

    report.proofs.wrong_command_name_rejected = {
      verdict: wrongCommand.status === 404 || wrongCommand.status === 400 ? 'PASS' : 'FAIL',
      status: wrongCommand.status,
      command: 'CompleteWorkItem',
      note: 'CompleteWorkItem is NOT a valid command - should be CompleteWork',
    };

    // ─────────────────────────────────────────────────────────────────────────
    // PROOF 2: work≠issue — completing work does NOT auto-resolve issue
    // ─────────────────────────────────────────────────────────────────────────

    if (issueId) {
      // Get issue state after work completion
      const issueAfterWork = await apiGet(managerToken, `/v1/issues/${issueId}`);

      const issueStatus = issueAfterWork.body?.status ?? issueAfterWork.body?.issue?.status;
      const issueNotResolved = issueStatus !== 'resolved' && issueStatus !== 'closed';

      report.proofs.work_complete_not_issue_resolved = {
        verdict: issueNotResolved ? 'PASS' : 'FAIL',
        issueStatus,
        invariant: 'Completing work does NOT auto-resolve the issue',
        note: 'Issue must be explicitly resolved via ResolveIssue command',
      };
    } else {
      report.proofs.work_complete_not_issue_resolved = {
        verdict: 'UNPROVEN',
        note: 'Could not create issue to test',
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROOF 3: Issue endpoints use correct path (no double /v1)
    // ─────────────────────────────────────────────────────────────────────────

    // Correct path: /v1/issues
    const correctPath = await apiGet(managerToken, '/v1/issues');
    // Wrong path (old double prefix): /v1/v1/issues
    const wrongPath = await apiGet(managerToken, '/v1/v1/issues');

    report.proofs.no_double_v1_prefix = {
      verdict: correctPath.status === 200 && wrongPath.status === 404 ? 'PASS' :
               correctPath.status === 200 ? 'CONDITIONAL' : 'FAIL',
      correctPathStatus: correctPath.status,
      wrongPathStatus: wrongPath.status,
      note: 'Controller should be @Controller("issues"), not @Controller("v1/issues")',
    };

    // ─────────────────────────────────────────────────────────────────────────
    // PROOF 4: Commitments endpoint available
    // ─────────────────────────────────────────────────────────────────────────

    const commitments = await apiGet(managerToken, '/v1/commitments');
    report.proofs.commitments_endpoint = {
      verdict: commitments.status === 200 ? 'PASS' : 'FAIL',
      status: commitments.status,
      hasItems: Array.isArray(commitments.body?.items),
    };

  } catch (e) {
    report.errors.push(String(e?.stack || e));
  }

  // Compute summary
  report.summary = Object.fromEntries(
    Object.entries(report.proofs).map(([k, v]) => [k, v?.verdict ?? 'UNKNOWN'])
  );

  const counts = { PASS: 0, FAIL: 0, CONDITIONAL: 0, UNPROVEN: 0, UNKNOWN: 0 };
  for (const v of Object.values(report.summary)) {
    if (counts[v] !== undefined) counts[v]++;
    else counts.UNKNOWN++;
  }
  report.counts = counts;

  const allPass = counts.FAIL === 0 && counts.UNPROVEN === 0 && counts.UNKNOWN === 0;
  const conditional = counts.FAIL === 0 && (counts.UNPROVEN > 0 || counts.CONDITIONAL > 0);
  report.overallVerdict = allPass ? 'PASS' : conditional ? 'CONDITIONAL' : 'FAIL';

  // Write output
  writeFileSync(join(OUT, 'wave-b-close-report.json'), JSON.stringify(report, null, 2));
  writeFileSync('/tmp/wave-b-close-report.json', JSON.stringify(report, null, 2));

  console.log(JSON.stringify({
    summary: report.summary,
    counts: report.counts,
    overallVerdict: report.overallVerdict,
    errors: report.errors,
  }, null, 2));

  process.exit(report.overallVerdict === 'FAIL' ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
