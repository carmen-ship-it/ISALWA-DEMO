import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatAuditSnapshot, snapshotSectionTitle } from './format-snapshot';

describe('formatAuditSnapshot', () => {
  it('pretty-prints JSON objects', () => {
    const text = formatAuditSnapshot({ name: 'Acme' });
    assert.match(text, /"name"/);
    assert.match(text, /Acme/);
  });

  it('labels snapshot sections in Spanish', () => {
    assert.equal(snapshotSectionTitle('before'), 'Estado anterior');
    assert.equal(snapshotSectionTitle('after'), 'Estado posterior');
  });
});
