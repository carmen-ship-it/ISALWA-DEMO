import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PALETTE_MIN_QUERY } from '@/lib/shell/command-palette';
import {
  PALETTE_SEARCH_DEBOUNCE_MS,
  isStaleSearchGeneration,
  settlePaletteStatus,
  shouldFireRecordSearch,
  shouldScanDeliveryDocuments,
} from '@/lib/shell/palette-search-orchestration';

const here = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(resolve(here, rel), 'utf8');
}

describe('Task 10A — global search hosted performance', () => {
  it('EMPTY_QUERY / ONE_CHARACTER do not fire record search', () => {
    assert.equal(shouldFireRecordSearch(''), false);
    assert.equal(shouldFireRecordSearch(' '), false);
    assert.equal(shouldFireRecordSearch('c'), false);
    assert.equal(shouldFireRecordSearch('co'), true);
    assert.equal(PALETTE_MIN_QUERY, 2);
    assert.equal(shouldFireRecordSearch('c', PALETTE_MIN_QUERY), false);
  });

  it('SEARCH_DEBOUNCE_MS is deliberate and within the accepted band', () => {
    assert.equal(PALETTE_SEARCH_DEBOUNCE_MS, 180);
    assert.ok(PALETTE_SEARCH_DEBOUNCE_MS >= 150 && PALETTE_SEARCH_DEBOUNCE_MS <= 300);
  });

  it('document scan is skipped for name fragments like construc', () => {
    assert.equal(shouldScanDeliveryDocuments('construc'), false);
    assert.equal(shouldScanDeliveryDocuments('con'), false);
    assert.equal(shouldScanDeliveryDocuments('NE-0001'), true);
    assert.equal(shouldScanDeliveryDocuments('nota entrega'), true);
    assert.equal(shouldScanDeliveryDocuments('O-000007'), true);
  });

  it('FAST_SOURCE_NOT_BLOCKED — no-match withheld while waves pending', () => {
    assert.equal(
      settlePaletteStatus({
        pendingWaves: 1,
        itemCount: 2,
        anySourceOk: true,
        anySourceFailed: false,
        sessionFailed: false,
        partialFlag: false,
      }),
      'loading',
    );
    assert.equal(
      settlePaletteStatus({
        pendingWaves: 1,
        itemCount: 0,
        anySourceOk: true,
        anySourceFailed: false,
        sessionFailed: false,
        partialFlag: false,
      }),
      'loading',
    );
    assert.equal(
      settlePaletteStatus({
        pendingWaves: 0,
        itemCount: 0,
        anySourceOk: true,
        anySourceFailed: false,
        sessionFailed: false,
        partialFlag: false,
      }),
      'empty',
    );
  });

  it('PARTIAL_SOURCE_FAILURE_PRESERVES_GOOD_RESULTS', () => {
    assert.equal(
      settlePaletteStatus({
        pendingWaves: 0,
        itemCount: 3,
        anySourceOk: true,
        anySourceFailed: true,
        sessionFailed: false,
        partialFlag: false,
      }),
      'partial',
    );
  });

  it('ALL_SOURCES_FAIL is error — never no-match', () => {
    assert.equal(
      settlePaletteStatus({
        pendingWaves: 0,
        itemCount: 0,
        anySourceOk: false,
        anySourceFailed: true,
        sessionFailed: false,
        partialFlag: false,
      }),
      'error',
    );
  });

  it('STALE_QUERY_RESULT_OVERWRITE guard', () => {
    assert.equal(isStaleSearchGeneration(4, 3), true);
    assert.equal(isStaleSearchGeneration(3, 3), false);
  });

  it('INDEPENDENT_SOURCES_RUN_CONCURRENTLY in primary searchPalette', () => {
    const src = read('command-search.ts');
    assert.match(src, /await Promise\.all\(\s*\[\s*partyPromise/);
    assert.match(src, /searchPaletteFollowUp/);
    assert.match(src, /shouldScanDeliveryDocuments/);
    // Primary path must not await collectDeliveryDocuments / relatedForParty before return.
    const primary = src.slice(
      src.indexOf('export async function searchPalette(query: string)'),
      src.indexOf('export async function searchPaletteFollowUp'),
    );
    assert.doesNotMatch(primary, /collectDeliveryDocuments/);
    assert.doesNotMatch(primary, /relatedForParty\(/);
    assert.match(primary, /Promise\.all\(\s*candidates\.map|resolveCommercialLenses/);
  });

  it('UI paints primary before extend/follow-up and uses generation token', () => {
    const ui = read('../../components/shell/command-palette.tsx');
    assert.match(ui, /PALETTE_SEARCH_DEBOUNCE_MS/);
    assert.match(ui, /searchGenRef/);
    assert.match(ui, /searchPaletteFollowUp/);
    assert.match(ui, /Seguimos buscando/);
    const start = ui.indexOf('const primaryPromise = searchPalette');
    assert.ok(start >= 0);
    const effect = ui.slice(start, start + 1800);
    const firstPaint = effect.indexOf('setRemote(primary.items)');
    const awaitExtra = effect.indexOf('await Promise.all');
    assert.ok(firstPaint >= 0, 'primary paint missing');
    assert.ok(awaitExtra > firstPaint, 'extend/follow-up must run after first paint');
  });

  it('lens probes are parallelized', () => {
    const src = read('command-search.ts');
    assert.match(src, /Promise\.all\(\s*candidates\.map\(async \(visibility\)/);
  });
});
