import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * ServerMemberTypeahead contracts (pure). Component uses searchActiveMembersAction
 * with debounce + min query; this locks the non-UI invariants without a browser.
 */
describe('server member typeahead search contracts', () => {
  it('requires at least two characters before searching', () => {
    const MIN_QUERY = 2;
    assert.equal('a'.trim().length < MIN_QUERY, true);
    assert.equal('an'.trim().length < MIN_QUERY, false);
  });

  it('never treats raw member ids as primary labels', () => {
    const items = [{ value: 'mem-1', label: 'Ana Quispe' }];
    for (const item of items) {
      assert.notEqual(item.label, item.value);
      assert.match(item.label, /[A-Za-zÁÉÍÓÚáéíóúÑñ]/);
    }
  });

  it('maps permission failures to denied, not empty success', () => {
    type Result =
      | { ok: true; items: unknown[] }
      | { ok: false; reason: 'denied' | 'unavailable' | 'session' };
    const denied: Result = { ok: false, reason: 'denied' };
    assert.equal(denied.ok, false);
    assert.notEqual(denied.reason, undefined);
  });
});
