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
