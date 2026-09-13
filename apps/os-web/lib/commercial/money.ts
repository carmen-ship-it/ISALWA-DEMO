/** Display centavos as currency without floating-point math. */
export function formatCentavos(centavos: string, currency = 'BOB'): string {
  if (!/^-?\d+$/.test(centavos)) return `${currency} —`;
  const negative = centavos.startsWith('-');
  const digits = negative ? centavos.slice(1) : centavos;
  const value = BigInt(digits);
  const whole = value / BigInt(100);
  const frac = value % BigInt(100);
  const fracStr = frac.toString().padStart(2, '0');
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const prefix = currency === 'BOB' ? 'Bs.' : currency;
  return `${prefix} ${negative ? '-' : ''}${wholeStr},${fracStr}`;
}

export function formatOptionalCentavos(
  centavos: string | null | undefined,
  currency = 'BOB',
): string | null {
  if (centavos == null || centavos === '') return null;
  return formatCentavos(centavos, currency);
}
