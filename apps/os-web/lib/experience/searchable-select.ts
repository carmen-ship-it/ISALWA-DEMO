/**
 * In-memory filter for SearchableSelect.
 * Returns only members of the caller-supplied list. Never fetches and never creates an option.
 */

export type SearchableOption = {
  id: string;
  label: string;
  hint?: string;
};

/** Use SearchableSelect when the caller already holds more options than this. */
export const SEARCHABLE_SELECT_OPTION_THRESHOLD = 8;

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
