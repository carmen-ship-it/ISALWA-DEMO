/**
 * preview25 (reviewed JSON) ↔ starter21 (quote starter list) reconciliation.
 * Every starter key, active or retired, is listed. A key is never dropped.
 * Starter keys that differ from a canonical key stay as explicit aliases of the stable id.
 * The 25 reviewed candidates are not assumed to be 25 distinct SKUs.
 * Nothing here was re-checked against the PDF: CatalogoVitriCompleto2026.pdf is not on disk.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CatalogPreview } from '../../os-contracts/src/product-catalog';
import { stableProductId } from './stable-id';

export const RECONCILIATION_SCHEMA_VERSION = '1' as const;

export const RECONCILIATION_JSON_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../preview/starter21-reconciliation.json',
);

export const REVIEWED_PREVIEW_FILE = 'packages/os-catalog/preview/vitri-2026-reviewed.json';
export const STARTER_LIST_FILE = 'apps/os-web/lib/commercial/starter-quote-products.ts';

export type StarterKeyOrigin = 'starter21_active' | 'starter_retired';
export type ReconciliationOutcome = 'matched' | 'alias' | 'unmatched';

export type PdfCheck = {
  status: 'pending';
  reason: string;
};

export const PDF_CHECK_PENDING: PdfCheck = {
  status: 'pending',
  reason:
    'CatalogoVitriCompleto2026.pdf no está disponible localmente. Se reconcilió contra el JSON revisado; las páginas citadas son las del JSON y no se verificaron de nuevo.',
};

export type StarterReconciliationRow = {
  starterKey: string;
  /** null for retired keys: the starter file keeps only the key. */
  starterName: string | null;
  origin: StarterKeyOrigin;
  outcome: ReconciliationOutcome;
  canonicalKey: string | null;
  catalogId: string | null;
  basis: string;
  pdfCheck: PdfCheck;
};

export type PendingContradiction = {
  id: string;
  keys: string[];
  summary: string;
  sources: string[];
  resolution: 'pending';
};

type RowDraft = Omit<StarterReconciliationRow, 'catalogId' | 'pdfCheck'>;

function matched(
  starterKey: string,
  starterName: string | null,
  origin: StarterKeyOrigin,
  basis: string,
): RowDraft {
  return { starterKey, starterName, origin, outcome: 'matched', canonicalKey: starterKey, basis };
}

function alias(
  starterKey: string,
  starterName: string,
  canonicalKey: string,
  basis: string,
): RowDraft {
  return {
    starterKey,
    starterName,
    origin: 'starter21_active',
    outcome: 'alias',
    canonicalKey,
    basis,
  };
}

const SAME_KEY_AND_NAME = 'Misma clave y mismo nombre que el candidato revisado.';
const RETIRED_SAME_KEY =
  'Clave retirada de la lista inicial (sigue guardada en líneas de cotización). Es la clave canónica del candidato revisado.';

const ROW_DRAFTS: readonly RowDraft[] = [
  alias(
    'sanitario-capri',
    'Sanitario Capri',
    'inodoro-capri',
    'El JSON revisado nombra "Sanitario Capri" al candidato inodoro-capri (tabla p.7). La clave de la lista inicial queda como alias.',
  ),
  matched(
    'sanitario-cadiz',
    'Sanitario Cadiz',
    'starter21_active',
    SAME_KEY_AND_NAME,
  ),
  matched(
    'sanitario-verso',
    'Sanitario Verso',
    'starter21_active',
    'Misma clave. El JSON revisado imprime "Sanitario Verso (faldón)"; la lista inicial omite "(faldón)".',
  ),
  alias(
    'sanitario-alti',
    'Sanitario Alti',
    'alti',
    'El JSON revisado cita "Sanitario Alti" en el índice y tiene el alias "Sanitario Alti (tanque alto)" en el candidato alti.',
  ),
  matched(
    'lavamanos-pedestal-capri',
    'Lavamanos con pedestal Capri',
    'starter21_active',
    SAME_KEY_AND_NAME,
  ),
  matched('agatha', 'Agatha', 'starter21_active', SAME_KEY_AND_NAME),
  matched('bordda', 'Bordda', 'starter21_active', SAME_KEY_AND_NAME),
  matched('bari', 'Bari', 'starter21_active', SAME_KEY_AND_NAME),
  matched('bowl-new-cuadrado', 'Bowl New Cuadrado', 'starter21_active', SAME_KEY_AND_NAME),
  matched('bowl-ovale', 'Bowl Ovale', 'starter21_active', SAME_KEY_AND_NAME),
  matched('domino', 'Domino', 'starter21_active', SAME_KEY_AND_NAME),
  matched('kayak', 'Kayak', 'starter21_active', SAME_KEY_AND_NAME),
  matched('solare-blanco', 'Solare Blanco', 'starter21_active', SAME_KEY_AND_NAME),
  matched('gris-black', 'Gris Black', 'starter21_active', SAME_KEY_AND_NAME),
  matched(
    'quaza-blanco-satinado',
    'Quaza Blanco Satinado',
    'starter21_active',
    SAME_KEY_AND_NAME,
  ),
  matched('turin', 'Turin', 'starter21_active', SAME_KEY_AND_NAME),
  matched('tanque-verso', 'Tanque Verso', 'starter21_active', SAME_KEY_AND_NAME),
  matched('tanque-capri', 'Tanque Capri', 'starter21_active', SAME_KEY_AND_NAME),
  matched(
    'tanque-cadiz',
    'Tanque Cadiz',
    'starter21_active',
    'Misma clave. El JSON revisado imprime "Tanque Cádiz" y tiene el alias "Tanque Cadiz".',
  ),
  {
    starterKey: 'tanque-alto',
    starterName: 'Tanque Alto',
    origin: 'starter21_active',
    outcome: 'unmatched',
    canonicalKey: null,
    basis:
      'Sin coincidencia en el catálogo: el JSON revisado lo registra como no resuelto (solo en el índice, p.3, sin ficha). No se unió con alti ni se crearon medidas.',
  },
  alias(
    'urinario',
    'Urinario',
    'urinario-acqua',
    'El JSON revisado tiene el alias "Urinario" en urinario-acqua: el catálogo 2026 imprime URINARIO sin línea y el otro PDF imprime URINARIO ACQUA con las mismas medidas.',
  ),
  matched('set-capri', null, 'starter_retired', RETIRED_SAME_KEY),
  matched('inodoro-capri', null, 'starter_retired', RETIRED_SAME_KEY),
  matched('set-cadiz', null, 'starter_retired', RETIRED_SAME_KEY),
  matched('alti', null, 'starter_retired', RETIRED_SAME_KEY),
  matched('tanque-milan', null, 'starter_retired', RETIRED_SAME_KEY),
  matched('bowl-domino-embutir', null, 'starter_retired', RETIRED_SAME_KEY),
  matched('bowl-luma', null, 'starter_retired', RETIRED_SAME_KEY),
  matched('urinario-acqua', null, 'starter_retired', RETIRED_SAME_KEY),
];

export const PENDING_CONTRADICTIONS: readonly PendingContradiction[] = [
  {
    id: 'tanque-alto-selectable-without-sheet',
    keys: ['tanque-alto'],
    summary:
      'La lista inicial ofrece "Tanque Alto" como producto seleccionable; el JSON revisado solo lo tiene en el índice (p.3) sin ficha ni medidas.',
    sources: [STARTER_LIST_FILE, `${REVIEWED_PREVIEW_FILE} unresolved[Tanque Alto]`],
    resolution: 'pending',
  },
  {
    id: 'tanque-alto-vs-alti',
    keys: ['tanque-alto', 'sanitario-alti', 'alti'],
    summary:
      'El candidato alti tiene el alias "Sanitario Alti (tanque alto)" y la lista inicial tiene además una clave tanque-alto aparte. No se decidió si son el mismo producto.',
    sources: [STARTER_LIST_FILE, `${REVIEWED_PREVIEW_FILE} products[alti]`],
    resolution: 'pending',
  },
];

export function buildStarterReconciliation(): StarterReconciliationRow[] {
  return ROW_DRAFTS.map((row) => ({
    ...row,
    catalogId: row.canonicalKey ? stableProductId(row.canonicalKey) : null,
    pdfCheck: PDF_CHECK_PENDING,
  }));
}

export type ReconciliationSummary = {
  starterKeys: number;
  activeStarterKeys: number;
  retiredStarterKeys: number;
  matched: number;
  alias: number;
  unmatched: number;
  pendingContradictions: number;
  catalogCandidates: number;
  candidatesWithoutActiveStarterKey: string[];
};

export function summarizeReconciliation(
  preview: CatalogPreview,
  rows: readonly StarterReconciliationRow[] = buildStarterReconciliation(),
): ReconciliationSummary {
  const activeTargets = new Set(
    rows
      .filter((row) => row.origin === 'starter21_active' && row.canonicalKey)
      .map((row) => row.canonicalKey),
  );
  return {
    starterKeys: rows.length,
    activeStarterKeys: rows.filter((row) => row.origin === 'starter21_active').length,
    retiredStarterKeys: rows.filter((row) => row.origin === 'starter_retired').length,
    matched: rows.filter((row) => row.outcome === 'matched').length,
    alias: rows.filter((row) => row.outcome === 'alias').length,
    unmatched: rows.filter((row) => row.outcome === 'unmatched').length,
    pendingContradictions: PENDING_CONTRADICTIONS.length,
    catalogCandidates: preview.products.length,
    candidatesWithoutActiveStarterKey: preview.products
      .map((product) => product.canonicalKey)
      .filter((key) => !activeTargets.has(key))
      .sort(),
  };
}

export type CatalogKeyResolution =
  | {
      found: true;
      catalogId: string;
      canonicalKey: string;
      via: 'catalog_id' | 'canonical_key' | 'starter_alias' | 'starter_retired';
    }
  | { found: false; reason: 'unknown_key' | 'unmatched_starter_key'; basis: string | null };

/**
 * Resolves a stable id, a canonical key, or any historical starter key to one stable id.
 * An unmatched starter key returns its recorded reason; it never falls through to a guess.
 */
export function resolveCatalogKey(
  preview: CatalogPreview,
  key: string,
  rows: readonly StarterReconciliationRow[] = buildStarterReconciliation(),
): CatalogKeyResolution {
  const needle = key.trim();
  if (!needle) return { found: false, reason: 'unknown_key', basis: null };

  const byId = preview.products.find((product) => product.id === needle);
  if (byId) {
    return { found: true, catalogId: byId.id, canonicalKey: byId.canonicalKey, via: 'catalog_id' };
  }

  const row = rows.find((item) => item.starterKey === needle);
  if (row && row.outcome === 'unmatched') {
    return { found: false, reason: 'unmatched_starter_key', basis: row.basis };
  }
  if (row && row.outcome === 'alias' && row.canonicalKey) {
    const target = preview.products.find((product) => product.canonicalKey === row.canonicalKey);
    if (target) {
      return {
        found: true,
        catalogId: target.id,
        canonicalKey: target.canonicalKey,
        via: 'starter_alias',
      };
    }
  }

  const byKey = preview.products.find((product) => product.canonicalKey === needle);
  if (byKey) {
    return {
      found: true,
      catalogId: byKey.id,
      canonicalKey: byKey.canonicalKey,
      via: row?.origin === 'starter_retired' ? 'starter_retired' : 'canonical_key',
    };
  }
  return { found: false, reason: 'unknown_key', basis: null };
}

/** Starter keys that point at one catalog id, including the canonical key itself. */
export function historicalKeysFor(
  canonicalKey: string,
  rows: readonly StarterReconciliationRow[] = buildStarterReconciliation(),
): string[] {
  return [
    ...new Set(
      rows.filter((row) => row.canonicalKey === canonicalKey).map((row) => row.starterKey),
    ),
  ].sort();
}

export function canonicalReconciliationJson(preview: CatalogPreview): string {
  const rows = buildStarterReconciliation();
  const document = {
    schemaVersion: RECONCILIATION_SCHEMA_VERSION,
    kind: 'preview25_starter21_reconciliation',
    reviewedPreviewFile: REVIEWED_PREVIEW_FILE,
    reviewedOn: preview.reviewedOn,
    starterListFile: STARTER_LIST_FILE,
    pdfCheck: PDF_CHECK_PENDING,
    summary: summarizeReconciliation(preview, rows),
    rows,
    pendingContradictions: PENDING_CONTRADICTIONS,
  };
  return `${JSON.stringify(document, null, 2)}\n`;
}
