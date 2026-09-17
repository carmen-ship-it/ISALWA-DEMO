import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  auditListQuery,
  auditoriaEntryHref,
  auditoriaHrefCloseEntry,
  auditoriaHrefWithoutCursor,
  parseAuditQuery,
} from './url-state';

describe('audit url-state', () => {
  it('parses list and drawer params', () => {
    const state = parseAuditQuery({
      q: 'party',
      actorMemberId: 'mem-1',
      entry: 'audit-9',
      cursor: 'abc',
    });
    assert.equal(state.q, 'party');
    assert.equal(state.actorMemberId, 'mem-1');
    assert.equal(state.entry, 'audit-9');
    assert.equal(state.cursor, 'abc');
  });

  it('builds API query without entry', () => {
    const api = auditListQuery({
      entry: 'open-drawer',
      q: 'test',
      from: '2026-09-01',
    });
    assert.equal(api.q, 'test');
    assert.equal(api.from, '2026-09-01T00:00:00.000Z');
    assert.equal('entry' in api, false);
  });

  it('href helpers preserve filters and manage entry/cursor', () => {
    const base = { q: 'x', actorMemberId: 'm1' };
    assert.equal(
      auditoriaEntryHref('/auditoria', { ...base, cursor: 'c1' }, 'e1'),
      '/auditoria?q=x&actorMemberId=m1&entry=e1',
    );
    assert.equal(
      auditoriaHrefCloseEntry('/auditoria', { ...base, entry: 'e1' }),
      '/auditoria?q=x&actorMemberId=m1',
    );
    assert.equal(
      auditoriaHrefWithoutCursor('/auditoria', { ...base, cursor: 'c1', entry: 'e1' }),
      '/auditoria?q=x&actorMemberId=m1',
    );
  });
});
