import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { decodeAuditCursor, encodeAuditCursor } from './audit-cursor';

const root = join(import.meta.dirname);

describe('AuditController', () => {
  it('exposes cursor pagination and search query params', () => {
    const controller = readFileSync(join(root, 'audit.controller.ts'), 'utf8');
    assert.match(controller, /@Query\('cursor'\)/);
    assert.match(controller, /@Query\('q'\)/);
    assert.match(controller, /meta:\s*\{/);
    assert.match(controller, /nextCursor/);
    assert.match(controller, /@Query\('id'\)/);
    assert.match(controller, /beforeJson/);
  });

  it('allows owner-eval business audit via management/commercial org read (not people.admin only)', () => {
    const controller = readFileSync(join(root, 'audit.controller.ts'), 'utf8');
    assert.match(controller, /function assertAuditViewerScope/);
    assert.match(controller, /management\.org\.read/);
    assert.match(controller, /commercial\.org\.read/);
    assert.match(controller, /people\.admin/);
    assert.match(controller, /system\.admin/);
  });

  it('round-trips audit cursors', () => {
    const at = new Date('2026-09-16T12:00:00.000Z');
    const encoded = encodeAuditCursor(at, 'audit-1');
    const decoded = decodeAuditCursor(encoded);
    assert.ok(decoded);
    assert.equal(decoded?.id, 'audit-1');
    assert.equal(decoded?.t, at.toISOString());
    assert.equal(decodeAuditCursor('not-valid'), null);
  });
});
