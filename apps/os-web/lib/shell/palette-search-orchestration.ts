import { PALETTE_MIN_QUERY } from '@/lib/shell/command-palette';

/** Deliberate Cmd+K debounce — balances keystroke spam vs first useful paint. */
export const PALETTE_SEARCH_DEBOUNCE_MS = 180;

export function shouldFireRecordSearch(query: string, minQuery = PALETTE_MIN_QUERY): boolean {
  return query.trim().length >= minQuery;
}

/**
 * Delivery-document scan walks orders serially and is expensive.
 * Only run it when the query looks like a document/order reference.
 */
export function shouldScanDeliveryDocuments(query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  if (/^ne[\s_-]?/i.test(q) || /\bnota\b/i.test(q)) return true;
  if (/^o[\s_-]?\d/i.test(q)) return true;
  // Short numeric / order-ish tokens; never plain name fragments like "construc".
  if (/\d{4,}/.test(q) && q.length <= 24) return true;
  return false;
}

export type PaletteSettleInput = {
  pendingWaves: number;
  itemCount: number;
  anySourceOk: boolean;
  anySourceFailed: boolean;
  sessionFailed: boolean;
  partialFlag: boolean;
};

/**
 * Loading / partial / empty / error stay distinct.
 * No-match is withheld while waves remain pending.
 */
export function settlePaletteStatus(
  input: PaletteSettleInput,
): 'loading' | 'idle' | 'partial' | 'empty' | 'error' | 'session' {
  if (input.sessionFailed && input.itemCount === 0) return 'session';
  if (input.pendingWaves > 0) return 'loading';
  if (!input.anySourceOk && input.anySourceFailed) return 'error';
  // Successful sources returned nothing, but another source failed — not a truthful no-match.
  if (input.itemCount === 0 && (input.anySourceFailed || input.sessionFailed || input.partialFlag)) {
    return input.sessionFailed && !input.anySourceOk ? 'session' : 'partial';
  }
  if (input.itemCount === 0) return 'empty';
  if (input.partialFlag || input.anySourceFailed || input.sessionFailed) return 'partial';
  return 'idle';
}

export function isStaleSearchGeneration(active: number, captured: number): boolean {
  return active !== captured;
}
