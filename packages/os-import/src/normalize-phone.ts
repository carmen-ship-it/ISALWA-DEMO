/**
 * Normalize Bolivia phone / mobile values for Contact storage and match keys.
 * Accepts Excel numbers (float risk) and digit strings. Never logs the raw value.
 */
export function normalizeBoliviaPhone(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined || raw === '') return null;

  let text = typeof raw === 'number' ? String(Math.trunc(raw)) : String(raw).trim();
  if (!text) return null;

  // Excel sometimes yields "70000000.0"
  if (/^\d+\.0+$/.test(text)) {
    text = text.replace(/\.0+$/, '');
  }

  const digits = text.replace(/\D/g, '');
  if (!digits) return null;

  let national = digits;
  if (national.startsWith('591')) {
    national = national.slice(3);
  }
  if (national.startsWith('0')) {
    national = national.replace(/^0+/, '');
  }

  // BO mobiles are typically 8 digits starting with 6/7; landlines vary — keep 7–8 digit nationals.
  if (national.length < 7 || national.length > 8) {
    return null;
  }

  return `+591${national}`;
}

/** Match key: digits only under +591 country code (no plus). */
export function phoneMatchKey(normalized: string | null | undefined): string | null {
  if (!normalized) return null;
  const digits = normalized.replace(/\D/g, '');
  return digits || null;
}

/**
 * Split a cell only on explicit separators. Never concatenates tokens,
 * and never invents a split inside a single formatted number.
 */
export function splitPhoneTokens(raw: string | number | null | undefined): string[] {
  if (raw === null || raw === undefined || raw === '') return [];
  if (typeof raw === 'number') return [String(Math.trunc(raw))];
  const text = String(raw).trim();
  if (!text) return [];
  if (/^\d+\.0+$/.test(text)) return [text.replace(/\.0+$/, '')];
  if (/[/|,;]/.test(text)) {
    return text
      .split(/[/|,;]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [text];
}

/** Each token is normalized alone. Invalid fragments are dropped, never joined. */
export function normalizeBoliviaPhones(raw: string | number | null | undefined): string[] {
  const seen = new Set<string>();
  const numbers: string[] = [];
  for (const token of splitPhoneTokens(raw)) {
    const normalized = normalizeBoliviaPhone(token);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    numbers.push(normalized);
  }
  return numbers;
}
