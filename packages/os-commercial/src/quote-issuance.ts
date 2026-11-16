import { createHash } from 'node:crypto';
import { centavosToString, computeQuoteTotals } from './money';

/** Version tag of the snapshot layout. Changing the layout changes every hash: bump it. */
export const QUOTE_ISSUED_SNAPSHOT_VERSION = 1 as const;

export type QuoteIssuedSnapshotInput = {
  quoteNumber: string;
  revisionNumber: number;
  partyId: string;
  currency: string;
  notes: string | null;
  validUntil: Date | null;
  headerDiscountCentavos: bigint;
  lines: ReadonlyArray<{
    lineNumber: number;
    description: string;
    quantity: number;
    unitLabel: string | null;
    unitPriceCentavos: bigint;
    discountCentavos: bigint;
    lineTotalCentavos: bigint;
    productRef: string | null;
  }>;
};

/**
 * The material terms of one quote revision, as plain JSON-safe values with a fixed
 * key order and money as integer-minor-unit strings. Totals are recomputed from the
 * lines, never trusted from a stored header, so the hash cannot drift from the terms.
 */
export function buildQuoteIssuedSnapshot(input: QuoteIssuedSnapshotInput): Record<string, unknown> {
  const lines = [...input.lines].sort((a, b) => a.lineNumber - b.lineNumber);
  const totals = computeQuoteTotals(lines, input.headerDiscountCentavos);
  return {
    snapshotVersion: QUOTE_ISSUED_SNAPSHOT_VERSION,
    quoteNumber: input.quoteNumber,
    revisionNumber: input.revisionNumber,
    partyId: input.partyId,
    currency: input.currency,
    notes: input.notes ?? null,
    validUntil: input.validUntil ? input.validUntil.toISOString() : null,
    headerDiscountCentavos: centavosToString(input.headerDiscountCentavos),
    subtotalCentavos: centavosToString(totals.subtotalCentavos),
    totalCentavos: centavosToString(totals.totalCentavos),
    lines: lines.map((line) => ({
      lineNumber: line.lineNumber,
      description: line.description,
      quantity: line.quantity,
      unitLabel: line.unitLabel ?? null,
      unitPriceCentavos: centavosToString(line.unitPriceCentavos),
      discountCentavos: centavosToString(line.discountCentavos),
      lineTotalCentavos: centavosToString(line.lineTotalCentavos),
      productRef: line.productRef ?? null,
    })),
  };
}

/** JSON with object keys sorted at every depth, so equal values always serialize equally. */
export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
}

/** sha256 hex of the stable JSON snapshot. */
export function hashQuoteIssuedSnapshot(snapshot: Record<string, unknown>): string {
  return createHash('sha256').update(stableJson(snapshot), 'utf8').digest('hex');
}

export function quoteIssuedDocumentHash(input: QuoteIssuedSnapshotInput): string {
  return hashQuoteIssuedSnapshot(buildQuoteIssuedSnapshot(input));
}
