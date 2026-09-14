import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { formatBobDisplay, formatBoliviaDate, formatMoneyDisplay, stepQuantity } from './format';
import {
  SEARCHABLE_SELECT_VISIBLE_LIMIT,
  canSelectSearchableOption,
  filterSearchableOptions,
  nextSearchableIndex,
  searchableSelectMode,
  windowSearchableOptions,
  type SearchableOption,
} from './searchable-select';
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
const quantityFieldSource = readFileSync(
  resolve(here, '../../components/experience/quantity-field.tsx'),
  'utf8',
);
const taskSectionSource = readFileSync(
  resolve(here, '../../components/experience/task-section.tsx'),
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

  it('keeps a long list a typeahead instead of a giant dropdown', () => {
    const catalog = Array.from({ length: 40 }, (_, index) => ({
      id: `p-${index}`,
      label: `Producto ${index}`,
    }));
    const blank = searchableSelectMode({
      optionCount: catalog.length,
      query: '   ',
      matchCount: catalog.length,
      access: 'enabled',
    });
    const windowed = windowSearchableOptions(catalog);

    assert.equal(blank, 'prompt');
    assert.equal(windowed.visible.length, SEARCHABLE_SELECT_VISIBLE_LIMIT);
    assert.equal(windowed.truncated, true);
    assert.ok(windowed.visible.every((option) => catalog.includes(option)));
    assert.ok(windowed.totalMatches === catalog.length);
    assert.match(searchableSelectSource, /windowSearchableOptions\(/);
    assert.match(searchableSelectSource, /searchableSelectMode\(/);
    assert.doesNotMatch(searchableSelectSource, /filtered\.map\(/);
  });

  it('separates empty, no-results, and permission, and returns focus on Escape', () => {
    assert.equal(
      searchableSelectMode({ optionCount: 0, query: '', matchCount: 0, access: 'enabled' }),
      'empty',
    );
    assert.equal(
      searchableSelectMode({ optionCount: 3, query: 'zzz', matchCount: 0, access: 'enabled' }),
      'no-results',
    );
    assert.equal(
      searchableSelectMode({ optionCount: 20, query: 'pro', matchCount: 4, access: 'permission-denied' }),
      'locked',
    );
    assert.equal(canSelectSearchableOption({ id: 'a', label: 'Alfa', unavailableReason: 'Sin permiso' }), false);
    assert.equal(canSelectSearchableOption(OPTIONS[1]), true);
    assert.equal(nextSearchableIndex(0, 12, 'End'), 11);
    assert.equal(nextSearchableIndex(0, 0, 'ArrowDown'), 0);
    assert.match(searchableSelectSource, /returnFocus\(/);
    assert.match(searchableSelectSource, /Escape/);
    assert.match(searchableSelectSource, /tabIndex=\{-1\}/);
    assert.match(searchableSelectSource, /No hay opciones|SEARCHABLE_SELECT_COPY\.emptyTitle/);
    assert.match(searchableSelectSource, /Sin permiso para elegir|SEARCHABLE_SELECT_COPY\.permission/);
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
    const denied = workStateView('permission-denied');
    const unavailable = workStateView('disabled');
    assert.equal(denied.title, 'Sin permiso');
    assert.equal(unavailable.title, 'No disponible');
    assert.equal(denied.count, null);
    assert.equal(unavailable.showsCount, false);
  });
});

describe('Quantity step', () => {
  it('does not invent a zero when decreasing an empty quantity', () => {
    assert.equal(stepQuantity(null, 'down'), null);
    assert.equal(stepQuantity(0, 'down'), 0);
    assert.equal(stepQuantity(2, 'down'), 1);
    assert.equal(stepQuantity(null, 'up'), 1);
    assert.match(quantityFieldSource, /QUANTITY_FIELD_COPY\.decrease/);
    assert.match(quantityFieldSource, /QUANTITY_FIELD_COPY\.increase/);
    assert.match(quantityFieldSource, /Sin permiso para cambiar la cantidad|QUANTITY_FIELD_COPY\.permission/);
    assert.match(quantityFieldSource, /Sin cantidad|QUANTITY_FIELD_COPY\.empty/);
  });
});

describe('Task section', () => {
  it('keeps the detail trigger visible and returns focus when the drawer closes', () => {
    assert.match(taskSectionSource, /WorkState/);
    assert.match(taskSectionSource, /returnFocus\(/);
    assert.match(taskSectionSource, /drawerLabel/);
    assert.doesNotMatch(taskSectionSource, /hover:opacity-0|group-hover:opacity-0|invisible group-hover/);
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
