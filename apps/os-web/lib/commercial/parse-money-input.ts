/** Parse employee BOB decimal input to centavo integer string (no float math). */
export function parseBobInputToCentavos(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(\.\d{0,2})?$/.test(normalized)) return null;

  const negative = normalized.startsWith('-');
  const digits = negative ? normalized.slice(1) : normalized;
  const [wholePart, fracPart = ''] = digits.split('.');
  if (!/^\d+$/.test(wholePart)) return null;
  if (fracPart && !/^\d{1,2}$/.test(fracPart)) return null;

  const frac = fracPart.padEnd(2, '0').slice(0, 2);
  const centavos = BigInt(wholePart) * BigInt(100) + BigInt(frac);
  const value = negative ? -centavos : centavos;
  return value.toString();
}

export function parseQuantityInput(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number.parseInt(trimmed, 10);
  return value >= 1 ? value : null;
}

/** Display centavos as BOB decimal for form fields (inverse of parseBobInputToCentavos). */
export function centavosToBobDisplay(centavos: string): string {
  if (!/^-?\d+$/.test(centavos)) return '';
  const negative = centavos.startsWith('-');
  const digits = negative ? centavos.slice(1) : centavos;
  const value = BigInt(digits);
  const whole = value / BigInt(100);
  const frac = value % BigInt(100);
  const fracStr = frac.toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole.toString()},${fracStr}`;
}
