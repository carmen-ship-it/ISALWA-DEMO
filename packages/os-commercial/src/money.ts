/** Integer centavos helpers — no floating-point financial arithmetic. */

export function parseCentavos(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) throw new Error('VALIDATION_FAILED');
    return BigInt(value);
  }
  if (!/^-?\d+$/.test(value)) throw new Error('VALIDATION_FAILED');
  return BigInt(value);
}

export function assertNonNegativeCentavos(value: bigint, field: string): void {
  if (value < 0n) throw new Error('VALIDATION_FAILED');
}

export function computeLineTotalCentavos(
  quantity: number,
  unitPriceCentavos: bigint,
  discountCentavos: bigint,
): bigint {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('VALIDATION_FAILED');
  assertNonNegativeCentavos(unitPriceCentavos, 'unitPriceCentavos');
  assertNonNegativeCentavos(discountCentavos, 'discountCentavos');
  const gross = BigInt(quantity) * unitPriceCentavos;
  const total = gross - discountCentavos;
  if (total < 0n) throw new Error('VALIDATION_FAILED');
  return total;
}

export function computeQuoteTotals(
  lines: Array<{ lineTotalCentavos: bigint }>,
  headerDiscountCentavos: bigint,
): { subtotalCentavos: bigint; totalCentavos: bigint } {
  assertNonNegativeCentavos(headerDiscountCentavos, 'headerDiscountCentavos');
  const subtotalCentavos = lines.reduce((sum, line) => sum + line.lineTotalCentavos, 0n);
  const totalCentavos = subtotalCentavos - headerDiscountCentavos;
  if (totalCentavos < 0n) throw new Error('VALIDATION_FAILED');
  return { subtotalCentavos, totalCentavos };
}

export function centavosToString(value: bigint): string {
  return value.toString();
}
