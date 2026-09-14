export type TypeaheadOption = {
  value: string;
  label: string;
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();
}

/**
 * Filters options already held by the caller. Matches typed text against the
 * visible label only — not ids, roles, credit, or price.
 */
export function filterTypeaheadOptions(
  options: readonly TypeaheadOption[],
  query: string,
): TypeaheadOption[] {
  const needle = normalize(query);
  if (!needle) return [...options];
  return options.filter((option) => normalize(option.label).includes(needle));
}

/** Remote lookups stay empty until the query is long enough, then cap the result. */
export const TYPEAHEAD_MIN_QUERY = 2;
export const TYPEAHEAD_RESULT_LIMIT = 8;

export function boundedTypeaheadOptions(
  options: readonly TypeaheadOption[],
  query: string,
  limit = TYPEAHEAD_RESULT_LIMIT,
): TypeaheadOption[] {
  const needle = normalize(query);
  if (needle.length < TYPEAHEAD_MIN_QUERY) return [];
  const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : TYPEAHEAD_RESULT_LIMIT;
  return filterTypeaheadOptions(options, query).slice(0, cap);
}
