import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  decodeBoundListCursor,
  encodeBoundListCursor,
  pageCreatedAtDesc,
  pageLocationsActiveThenCreatedDesc,
  PARTY_LIST_DEFAULT_LIMIT,
} from './bound-list';

function loc(
  id: string,
  status: 'active' | 'inactive',
  createdAt: string,
): { id: string; status: string; createdAt: Date } {
  return { id, status, createdAt: new Date(createdAt) };
}

function contact(id: string, createdAt: string): { id: string; createdAt: Date } {
  return { id, createdAt: new Date(createdAt) };
}

describe('party bound-list — locations', () => {
  it('0/1/25/26 hasMore, default limit 25, no totals', () => {
    const base = new Date('2026-09-01T00:00:00.000Z').getTime();
    for (const count of [0, 1, 25, 26]) {
      const rows = Array.from({ length: count }, (_, i) =>
        loc(`loc-${String(i).padStart(3, '0')}`, 'inactive', new Date(base + i * 1000).toISOString()),
      );
      const page = pageLocationsActiveThenCreatedDesc(rows, { limit: PARTY_LIST_DEFAULT_LIMIT });
      assert.equal(page.items.length, Math.min(count, 25));
      assert.equal(page.hasMore, count > 25);
      assert.equal('total' in page, false);
      assert.equal('count' in page, false);
      if (count <= 25) assert.equal(page.nextCursor, null);
      else assert.ok(page.nextCursor);
    }
  });

  it('puts active/current locations on the first page ahead of newer inactive rows', () => {
    const rows = [
      loc('inactive-new', 'inactive', '2026-09-20T00:00:00.000Z'),
      loc('inactive-mid', 'inactive', '2026-09-10T00:00:00.000Z'),
      loc('active-old', 'active', '2026-01-01T00:00:00.000Z'),
      ...Array.from({ length: 24 }, (_, i) =>
        loc(`inactive-${i}`, 'inactive', new Date(Date.UTC(2026, 5, i + 1)).toISOString()),
      ),
    ];
    const page = pageLocationsActiveThenCreatedDesc(rows, { limit: 25 });
    assert.equal(page.items[0]?.id, 'active-old');
    assert.equal(page.items.length, 25);
    assert.equal(page.hasMore, true);
    assert.ok(page.items.every((row, index) => index === 0 || row.status === 'inactive'));
  });

  it('lists remainder after cursor without inventing totals', () => {
    const rows = Array.from({ length: 26 }, (_, i) =>
      loc(
        `loc-${String(i).padStart(2, '0')}`,
        i === 0 ? 'active' : 'inactive',
        new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
      ),
    );
    const first = pageLocationsActiveThenCreatedDesc(rows, { limit: 25 });
    assert.equal(first.items.length, 25);
    assert.equal(first.hasMore, true);
    const rest = pageLocationsActiveThenCreatedDesc(rows, {
      limit: 25,
      cursor: first.nextCursor ?? undefined,
    });
    assert.equal(rest.items.length, 1);
    assert.equal(rest.hasMore, false);
    assert.equal(rest.nextCursor, null);
    const ids = new Set([...first.items, ...rest.items].map((row) => row.id));
    assert.equal(ids.size, 26);
  });
});

describe('party bound-list — contacts', () => {
  it('getParty-shaped first page is bounded at 25; list remainder returns the 26th', () => {
    const rows = Array.from({ length: 26 }, (_, i) =>
      contact(`c-${String(i).padStart(2, '0')}`, new Date(Date.UTC(2026, 0, 26 - i)).toISOString()),
    );
    const detail = pageCreatedAtDesc(rows, { limit: 25 });
    assert.equal(detail.items.length, 25);
    assert.equal(detail.hasMore, true);
    assert.ok(detail.nextCursor);
    const listed = pageCreatedAtDesc(rows, { limit: 25, cursor: detail.nextCursor ?? undefined });
    assert.equal(listed.items.length, 1);
    assert.equal(listed.hasMore, false);
    assert.equal(listed.items[0]?.id, 'c-25');
  });

  it('round-trips cursors', () => {
    const encoded = encodeBoundListCursor({
      createdAt: '2026-09-20T00:00:00.000Z',
      id: 'contact-1',
    });
    const decoded = decodeBoundListCursor(encoded);
    assert.equal(decoded?.id, 'contact-1');
    assert.equal(decoded?.createdAt, '2026-09-20T00:00:00.000Z');
    assert.equal(decodeBoundListCursor('nope'), null);
  });
});
