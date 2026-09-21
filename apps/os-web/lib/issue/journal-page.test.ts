import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boundNewestFirst } from '../work/scale-bound';
import {
  ISSUE_JOURNAL_PAGE_SIZE,
  issueDetailHref,
  issueListReturnHref,
  journalPageLinks,
  journalRequestQuery,
  journalSurface,
} from './journal-page';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function entries(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `j-${String(i + 1).padStart(3, '0')}`,
    recordedAt: Date.UTC(2026, 0, 1) + i * 60_000,
  }));
}

describe('issue journal page', () => {
  it('page size is 25', () => {
    assert.equal(ISSUE_JOURNAL_PAGE_SIZE, 25);
    assert.equal(journalRequestQuery(undefined).journalLimit, 25);
    assert.equal(journalRequestQuery('25').journalCursor, '25');
  });

  for (const n of [0, 1, 25, 26, 100]) {
    it(`ISSUE_JOURNAL_${n === 100 ? '100_PLUS' : n}`, () => {
      const page = boundNewestFirst(entries(n), (entry) => entry.recordedAt, undefined, 25);
      assert.equal(page.page.length, Math.min(n, 25));
      assert.equal(page.limit, 25);
      assert.equal(page.hasMore, n > 25);
      if (n > 0) {
        assert.equal(page.page[0]?.id, `j-${String(n).padStart(3, '0')}`);
      }
      const surface = journalSurface(page.page.length, undefined);
      assert.equal(surface, n === 0 ? 'none' : 'events');
    });
  }

  it('ISSUE_JOURNAL_PAGE_2_REACHABLE', () => {
    const first = boundNewestFirst(entries(80), (entry) => entry.recordedAt, undefined, 25);
    assert.equal(first.nextCursor, '25');
    const second = boundNewestFirst(entries(80), (entry) => entry.recordedAt, first.nextCursor, 25);
    assert.equal(second.page.length, 25);
    assert.equal(second.page[0]?.id, 'j-055');
    const nav = journalPageLinks({
      issueId: 'iss-1',
      nextCursor: first.nextCursor,
      hasMore: true,
      list: { view: 'assigned', cursor: '25', trail: '["50"]' },
    });
    assert.match(nav.nextHref ?? '', /\/incidencias\/iss-1\?/);
    assert.match(nav.nextHref ?? '', /journalCursor=25/);
    assert.match(nav.nextHref ?? '', /lv=assigned/);
    assert.match(nav.nextHref ?? '', /lc=25/);
    assert.doesNotMatch(nav.nextHref ?? '', /(?:^|[?&])cursor=/);
    const back = journalPageLinks({
      issueId: 'iss-1',
      journalCursor: '25',
      journalTrail: '[""]',
      nextCursor: second.nextCursor,
      hasMore: second.hasMore,
      list: { view: 'assigned' },
    });
    assert.ok(back.prevHref);
    assert.doesNotMatch(back.prevHref ?? '', /journalCursor=/);
    assert.match(back.prevHref ?? '', /lv=assigned/);
  });

  it('empty, stale page, and list return stay distinct', () => {
    assert.equal(journalSurface(0, undefined), 'none');
    assert.equal(journalSurface(0, '25'), 'stale');
    assert.equal(journalSurface(3, '25'), 'events');
    const href = issueListReturnHref({ view: 'resolved', cursor: '25', trail: '[""]' });
    assert.match(href, /\/incidencias\?/);
    assert.match(href, /view=resolved/);
    assert.match(href, /cursor=25/);
    assert.doesNotMatch(href, /journalCursor/);
    const detail = issueDetailHref('iss/1', { view: 'assigned', cursor: '25' });
    assert.match(detail, /\/incidencias\/iss%2F1\?/);
    assert.match(detail, /lv=assigned/);
    assert.match(detail, /lc=25/);
  });

  it('detail UI is bounded, has no fake total, and list nav is unchanged', () => {
    const detail = read('app/(app)/incidencias/[issueId]/page.tsx');
    assert.match(detail, /journalRequestQuery/);
    assert.match(detail, /ListPageNav/);
    assert.match(detail, /total=\{null\}/);
    assert.match(detail, /journalSurface/);
    assert.match(detail, /QuerySurfaceState/);
    assert.doesNotMatch(detail, /de \{journal/);
    assert.doesNotMatch(detail, /pendiente de cableado/);
    const client = read('lib/api/os-api-client.ts');
    assert.match(client, /getIssue: \(issueId: string, query\?: Record<string, string \| number \| boolean>\)/);
    const list = read('app/(app)/incidencias/page.tsx');
    assert.match(list, /cursorPageLinks/);
    assert.match(list, /ListPageNav/);
    assert.match(list, /view: view === 'open' \? undefined : view/);
    assert.doesNotMatch(list, /journalCursor/);
    const api = readFileSync(join(root, '../../apps/os-api/src/issues.controller.ts'), 'utf8');
    const authAt = api.indexOf('if (!this.canReadIssue(snap, issue))');
    const sliceAt = api.indexOf('const page = sorted.slice');
    assert.ok(authAt > 0 && sliceAt > authAt);
  });
});
