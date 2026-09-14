import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  hrefWithoutPanel,
  listHref,
  parseListQuery,
  parsePanel,
} from './url-state';

describe('list URL state', () => {
  it('round-trips search, filters, view, and cursor', () => {
    const state = parseListQuery({
      q: ' import ',
      status: 'submitted',
      view: 'overdue',
      cursor: 'abc',
      panel: 'party:01PART',
    });
    assert.equal(state.q, 'import');
    assert.equal(
      listHref('/cotizaciones', state),
      '/cotizaciones?q=import&status=submitted&view=overdue&cursor=abc&panel=party%3A01PART',
    );
  });

  it('drops the panel without dropping the working list context', () => {
    const state = parseListQuery({ q: 'ast', status: 'active', panel: 'quote:01QUOTE' });
    assert.equal(hrefWithoutPanel('/cotizaciones', state), '/cotizaciones?q=ast&status=active');
  });

  it('accepts only party and quote panels', () => {
    assert.deepEqual(parsePanel('party:01ABC'), { kind: 'party', id: '01ABC' });
    assert.deepEqual(parsePanel('quote:01QUOTE'), { kind: 'quote', id: '01QUOTE' });
    assert.equal(parsePanel('approval:01'), null);
    assert.equal(parsePanel('party:../x'), null);
  });
});
