/** Comparison key for commercial / person names — exact match only (no fuzzy). */
export function normalizeNameKey(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeEmailKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : null;
}

export function normalizeNitKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}
