import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { boundedTypeaheadOptions, filterTypeaheadOptions, type TypeaheadOption } from './typeahead';

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

describe('boundedTypeaheadOptions', () => {
  it('does not dump the held list for a blank or single-character query', () => {
    assert.deepEqual(boundedTypeaheadOptions(members, ''), []);
    assert.deepEqual(boundedTypeaheadOptions(members, 'a'), []);
  });

  it('caps matches and still ignores ids', () => {
    const many: TypeaheadOption[] = Array.from({ length: 12 }, (_, index) => ({
      value: `mem-${index}`,
      label: `Ana ${index}`,
    }));
    const matched = boundedTypeaheadOptions(many, 'ana', 3);
    assert.equal(matched.length, 3);
    assert.equal(boundedTypeaheadOptions(members, 'mem-ana').length, 0);
  });
});
