import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { formatBobDisplay, formatBoliviaDate, formatMoneyDisplay } from './format';
import { filterSearchableOptions, type SearchableOption } from './searchable-select';
import { workStateView } from './work-state';

const here = dirname(fileURLToPath(import.meta.url));
const searchableSelectSource = readFileSync(
  resolve(here, '../../components/experience/searchable-select.tsx'),
  'utf8',
);
const workStateSource = readFileSync(
  resolve(here, '../../components/experience/work-state.tsx'),
  'utf8',
);

const OPTIONS: SearchableOption[] = [
  { id: 'a', label: 'Alfa', hint: 'grupo uno' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
];

describe('SearchableSelect filter', () => {
  it('filters the caller list by label and hint', () => {
    const byLabel = filterSearchableOptions(OPTIONS, 'alf');
    const byHint = filterSearchableOptions(OPTIONS, 'grupo');

    assert.deepEqual(
      byLabel.map((option) => option.id),
      ['a'],
    );
    assert.deepEqual(
      byHint.map((option) => option.id),
      ['a'],
    );
    assert.equal(byLabel[0], OPTIONS[0]);
    assert.match(searchableSelectSource, /filterSearchableOptions\(options, query\)/);
  });

  it('cannot invent an option that was not in the input list', () => {
    const unmatched = filterSearchableOptions(OPTIONS, 'Delta');
    const typedAsNew = filterSearchableOptions(OPTIONS, 'Opción nueva');
    const all = filterSearchableOptions(OPTIONS, '   ');

    assert.equal(
      unmatched.some((option) => option.label === 'Delta' || option.id === 'Delta'),
      false,
    );
    assert.equal(
      typedAsNew.some((option) => option.label === 'Opción nueva'),
      false,
    );
    assert.deepEqual(unmatched, []);
    assert.deepEqual(typedAsNew, []);
    assert.equal(all.length, OPTIONS.length);
    assert.ok(all.every((option) => OPTIONS.includes(option)));
    assert.ok([...unmatched, ...typedAsNew, ...all].every((option) => OPTIONS.includes(option)));
    assert.doesNotMatch(searchableSelectSource, /fetch\s*\(/);
    assert.doesNotMatch(searchableSelectSource, /supabase|useSWR|getServerSession|createBrowserClient/i);
  });
});

describe('WorkState', () => {
  it('does not invent a zero', () => {
    const empty = workStateView('empty');
    const zeroResult = workStateView('zero-result');
    const supplied = workStateView('zero-result', { count: 0 });

    assert.equal(empty.count, null);
    assert.equal(empty.showsCount, false);
    assert.equal(zeroResult.count, null);
    assert.equal(zeroResult.showsCount, false);
    assert.doesNotMatch(`${empty.title} ${empty.description}`, /\b0\b/);
    assert.doesNotMatch(`${zeroResult.title} ${zeroResult.description}`, /\b0\b/);
    assert.equal(supplied.count, 0);
    assert.equal(supplied.showsCount, true);
    assert.doesNotMatch(workStateSource, /count\s*=\s*0|count\s*\?\?\s*0|\|\|\s*0/);
    assert.match(workStateSource, /view\.showsCount/);
  });
});

describe('Bolivia date display', () => {
  it('does not shift a calendar date out of America/La_Paz', () => {
    assert.equal(formatBoliviaDate('2026-09-14'), '14/09/2026');
    assert.equal(formatBoliviaDate('2026-01-01'), '01/01/2026');
    assert.equal(formatBoliviaDate('2026-09-14T03:30:00.000Z'), '13/09/2026');
    assert.equal(formatBoliviaDate('2026-09-14T04:00:00.000Z'), '14/09/2026');
    assert.equal(formatBoliviaDate('not-a-date'), null);
  });
});

describe('BOB display', () => {
  it('does not convert another currency into bolivianos', () => {
    assert.equal(formatBobDisplay('150'), 'Bs. 1,50');
    const usd = formatMoneyDisplay('150', 'USD');
    assert.match(usd, /^USD /);
    assert.doesNotMatch(usd, /Bs\./);
  });
});
