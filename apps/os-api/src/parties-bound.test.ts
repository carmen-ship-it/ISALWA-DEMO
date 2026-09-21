import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  pageCreatedAtDesc,
  pageLocationsActiveThenCreatedDesc,
  PARTY_LIST_DEFAULT_LIMIT,
} from '@isalwa/os-party';

const root = join(import.meta.dirname);

function loc(id: string, status: 'active' | 'inactive', day: number) {
  return { id, status, createdAt: new Date(Date.UTC(2026, 0, day)) };
}

function contact(id: string, day: number) {
  return { id, createdAt: new Date(Date.UTC(2026, 0, day)) };
}

describe('TASK 11D — party locations bound', () => {
  it('controller uses CursorPaginationSchema and returns meta without totals', () => {
    const src = readFileSync(join(root, 'parties.controller.ts'), 'utf8');
    assert.match(src, /CursorPaginationSchema/);
    assert.match(src, /listLocationsForParty\(session\.organizationId, partyId, \{/);
    assert.match(src, /meta:\s*\{\s*nextCursor: page\.nextCursor,\s*limit: parsed\.data\.limit,\s*hasMore: page\.hasMore/);
    assert.doesNotMatch(src, /locationsMeta[\s\S]{0,80}total/);
    assert.match(src, /getPartyInOrg\(session\.organizationId, partyId\)/);
  });

  it('0/1/25/26 hasMore; active on first page; no totals', () => {
    for (const count of [0, 1, 25, 26]) {
      const rows = Array.from({ length: count }, (_, i) => loc(`l-${i}`, 'inactive', i + 1));
      const page = pageLocationsActiveThenCreatedDesc(rows, { limit: PARTY_LIST_DEFAULT_LIMIT });
      assert.equal(page.items.length, Math.min(count, 25));
      assert.equal(page.hasMore, count === 26);
      const body = {
        partyId: 'p1',
        locations: page.items,
        meta: { nextCursor: page.nextCursor, limit: 25, hasMore: page.hasMore },
      };
      assert.equal('total' in body, false);
      assert.equal('total' in body.meta, false);
    }
    const mixed = [
      loc('inactive-new', 'inactive', 30),
      ...Array.from({ length: 25 }, (_, i) => loc(`in-${i}`, 'inactive', i + 1)),
      loc('active-old', 'active', 1),
    ];
    const first = pageLocationsActiveThenCreatedDesc(mixed, { limit: 25 });
    assert.equal(first.items[0]?.id, 'active-old');
    assert.equal(first.hasMore, true);
  });
});

describe('TASK 11D — party contacts bound', () => {
  it('getParty is bounded and list remainder returns the 26th', () => {
    const src = readFileSync(join(root, 'parties.controller.ts'), 'utf8');
    assert.match(src, /@Get\(':partyId\/contacts'\)/);
    assert.match(src, /contactsMeta/);
    assert.match(src, /listContactsForOrgParty\(\s*session\.organizationId,\s*partyId,\s*\{\s*limit: 25/);
    assert.match(src, /limit: 25,\s*hasMore: contactsPage\.hasMore/);
    assert.doesNotMatch(src, /contactsMeta[\s\S]{0,80}total:/);

    const rows = Array.from({ length: 26 }, (_, i) => contact(`c-${i}`, 26 - i));
    const detail = pageCreatedAtDesc(rows, { limit: 25 });
    assert.equal(detail.items.length, 25);
    assert.equal(detail.hasMore, true);
    const remainder = pageCreatedAtDesc(rows, { limit: 25, cursor: detail.nextCursor ?? undefined });
    assert.equal(remainder.items.length, 1);
    assert.equal(remainder.hasMore, false);
    assert.equal(remainder.items[0]?.id, 'c-25');
  });
});
