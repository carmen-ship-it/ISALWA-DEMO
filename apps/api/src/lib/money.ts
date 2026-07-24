export function money(centavos: bigint | number | null | undefined) {
  const n = Number(centavos ?? 0);
  const whole = Math.trunc(n / 100);
  const frac = Math.abs(n % 100)
    .toString()
    .padStart(2, '0');
  return {
    centavos: n,
    label: `Bs ${whole.toLocaleString('es-BO')},${frac}`,
  };
}

export function bobLabel(centavos: number | bigint) {
  return money(centavos).label;
}
