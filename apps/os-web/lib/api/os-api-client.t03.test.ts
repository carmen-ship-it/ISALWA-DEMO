import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createOsApiClient } from './os-api-client';

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };

/** T03 dependency methods for Lane B: exact paths, methods and no retry on commands. */
describe('os-api-client T03 methods', () => {
  const realFetch = globalThis.fetch;
  const calls: Call[] = [];
  let status = 200;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_OS_API_URL = 'http://api.test/v1';
    calls.length = 0;
    status = 200;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        method: init?.method ?? 'GET',
        headers: init?.headers as Record<string, string>,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return new Response(JSON.stringify({ ok: true }), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.NEXT_PUBLIC_OS_API_URL;
  });

  const client = () =>
    createOsApiClient({
      mode: 'dev',
      session: { organizationId: 'org-1', memberId: 'm-1', personId: 'p-1', authIdentityId: 'a-1' },
    } as Parameters<typeof createOsApiClient>[0]);

  it('reads the L1–L3 previews under the customer path', async () => {
    await client().getContactRelationshipEndPreview('party 1', 'contact/2');
    await client().getContactFollowupPreferences('party-1', 'contact-2');
    await client().getCustomerArchivePreview('party-1');
    assert.deepEqual(
      calls.map((c) => [c.method, c.url]),
      [
        ['GET', 'http://api.test/v1/parties/party%201/contacts/contact%2F2/relationship-end-preview'],
        ['GET', 'http://api.test/v1/parties/party-1/contacts/contact-2/followup-preferences'],
        ['GET', 'http://api.test/v1/parties/party-1/archive-preview'],
      ],
    );
  });

  it('pages L4 candidates with limit and cursor, and looks one up by id', async () => {
    await client().getIssueCorrection('issue-1');
    await client().listIssueCorrectionCandidates('issue-1');
    await client().listIssueCorrectionCandidates('issue-1', { limit: 10, cursor: 'abc_-' });
    await client().getIssueCorrectionCandidate('issue-1', 'event-9');
    assert.deepEqual(
      calls.map((c) => c.url),
      [
        'http://api.test/v1/issues/issue-1/correction',
        'http://api.test/v1/issues/issue-1/correction/candidate-events',
        'http://api.test/v1/issues/issue-1/correction/candidate-events?limit=10&cursor=abc_-',
        'http://api.test/v1/issues/issue-1/correction/candidate-events/event-9',
      ],
    );
  });

  it('sends import commands as POST with the idempotency key and never retries them', async () => {
    status = 503;
    await assert.rejects(
      client().executeImportCommand('ResolveImportPhoneValue', { importBatchId: 'b-1' }, 'key-1'),
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.method, 'POST');
    assert.equal(calls[0]!.url, 'http://api.test/v1/commands/ResolveImportPhoneValue');
    assert.equal(calls[0]!.headers['idempotency-key'], 'key-1');
    assert.deepEqual(calls[0]!.body, { importBatchId: 'b-1' });
  });
});
