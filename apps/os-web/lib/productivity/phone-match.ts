const ACCENT = /[\u0300-\u036f]/g;

export function foldSearchText(value: string): string {
  return value.normalize('NFD').replace(ACCENT, '').toLocaleLowerCase('es').trim();
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Extra party-search query when the typed text is not already the digit string.
 * Null means the existing search already covers this text. Never a synthetic hit.
 */
export function phoneSearchVariant(query: string): string | null {
  const digits = digitsOnly(query);
  if (digits.length < 4) return null;
  if (digits === query.trim()) return null;
  return digits;
}

export function textIncludes(haystack: string | null | undefined, query: string): boolean {
  const needle = foldSearchText(query);
  if (!needle || !haystack) return false;
  return foldSearchText(haystack).includes(needle);
}

export function phoneIncludes(phone: string | null | undefined, query: string): boolean {
  const digits = digitsOnly(query);
  if (digits.length < 4 || !phone) return false;
  return digitsOnly(phone).includes(digits);
}
