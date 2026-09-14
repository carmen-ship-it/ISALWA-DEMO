/**
 * In-memory filter for SearchableSelect.
 * Returns only members of the caller-supplied list. Never requests data and never creates an option.
 * The caller must pass a bounded list for the current tenant. This module does not load another tenant.
 */

import { resolveFieldAccess, type FieldAccess } from './work-state';

export type SearchableOption = {
  id: string;
  label: string;
  hint?: string;
  /** When set, the row stays visible but cannot be chosen. The reason is shown, not hidden until hover. */
  unavailableReason?: string;
};

/** Use SearchableSelect when the caller already holds more options than this. */
export const SEARCHABLE_SELECT_OPTION_THRESHOLD = 8;

/**
 * Hard cap on rendered rows. A blank query above this cap asks the operator to type
 * instead of opening a giant dropdown.
 */
export const SEARCHABLE_SELECT_VISIBLE_LIMIT = 12;

export const SEARCHABLE_SELECT_COPY = {
  emptyTitle: 'No hay opciones',
  emptyDescription: 'Cuando existan, podrá buscarlas aquí.',
  prompt: 'Escriba para buscar',
  promptDescription: 'Hay muchas opciones. Escriba para acotar.',
  noResults: 'Ningún resultado coincide',
  truncated: 'Hay más coincidencias. Escriba para acotar.',
  disabled: 'No disponible',
  permission: 'Sin permiso para elegir',
  chosen: 'Elegido',
  clear: 'Quitar',
  placeholder: 'Buscar',
} as const;

export type SearchableSelectMode = 'locked' | 'empty' | 'prompt' | 'no-results' | 'results';

export function searchableQueryIsBlank(query: string): boolean {
  return query.trim() === '';
}

/**
 * Decides what a typeahead may show. A blank query on a long list is a prompt, not the full list.
 * Locked and empty do not open a dropdown of options.
 */
export function searchableSelectMode(input: {
  optionCount: number;
  query: string;
  matchCount: number;
  access: FieldAccess;
}): SearchableSelectMode {
  if (input.access !== 'enabled') return 'locked';
  if (input.optionCount === 0) return 'empty';
  if (searchableQueryIsBlank(input.query) && input.optionCount > SEARCHABLE_SELECT_VISIBLE_LIMIT) {
    return 'prompt';
  }
  if (!searchableQueryIsBlank(input.query) && input.matchCount === 0) return 'no-results';
  return 'results';
}

/** Visible window of an already-filtered caller list. Does not request more rows. */
export function windowSearchableOptions<T>(
  matches: readonly T[],
  limit = SEARCHABLE_SELECT_VISIBLE_LIMIT,
): { visible: T[]; totalMatches: number; truncated: boolean } {
  const cap = Number.isInteger(limit) && limit > 0 ? limit : SEARCHABLE_SELECT_VISIBLE_LIMIT;
  const visible = matches.slice(0, cap);
  return {
    visible,
    totalMatches: matches.length,
    truncated: matches.length > visible.length,
  };
}

export function canSelectSearchableOption(option: SearchableOption | undefined): boolean {
  if (!option) return false;
  return (option.unavailableReason?.trim() ?? '') === '';
}

export function nextSearchableIndex(
  current: number,
  length: number,
  key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End',
): number {
  if (length <= 0) return 0;
  if (key === 'Home') return 0;
  if (key === 'End') return length - 1;
  if (key === 'ArrowDown') return Math.min(current + 1, length - 1);
  return Math.max(current - 1, 0);
}

export { resolveFieldAccess };

export function shouldUseSearchableSelect(optionCount: number): boolean {
  return optionCount > SEARCHABLE_SELECT_OPTION_THRESHOLD;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-BO')
    .trim();
}

/**
 * Filters `options` by label and hint. Every result is the same object the caller passed.
 * An unmatched query yields an empty list, not a new option.
 */
export function filterSearchableOptions<T extends SearchableOption>(
  options: readonly T[],
  query: string,
): T[] {
  const needle = normalize(query);
  const matched = needle
    ? options.filter((option) =>
        normalize(`${option.label} ${option.hint ?? ''}`).includes(needle),
      )
    : [...options];

  return matched.filter((option) => options.includes(option));
}
