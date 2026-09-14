import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filterTypeaheadOptions, type TypeaheadOption } from './typeahead';

const members: TypeaheadOption[] = [
  { value: 'mem-ana', label: 'Ana Quispe' },
  { value: 'mem-jose', label: 'José Núñez' },
  { value: 'mem-luz', label: 'Luz María Choque' },
];

describe('filterTypeaheadOptions', () => {
  it('returns the passed options when the query is blank', () => {
    assert.deepEqual(filterTypeaheadOptions(members, '   '), members);
  });

  it('filters by typed text without requiring accents or exact case', () => {
    assert.deepEqual(filterTypeaheadOptions(members, 'jose n'), [
      { value: 'mem-jose', label: 'José Núñez' },
    ]);
    assert.deepEqual(filterTypeaheadOptions(members, 'QUISPE'), [
      { value: 'mem-ana', label: 'Ana Quispe' },
    ]);
  });

  it('does not match member ids or invent options', () => {
    assert.deepEqual(filterTypeaheadOptions(members, 'mem-ana'), []);
    assert.deepEqual(filterTypeaheadOptions(members, 'crédito'), []);
    assert.deepEqual(filterTypeaheadOptions([], 'ana'), []);
  });

  it('returns an empty list when nothing matches, without adding a result', () => {
    assert.deepEqual(filterTypeaheadOptions(members, 'inexistente'), []);
  });
});
