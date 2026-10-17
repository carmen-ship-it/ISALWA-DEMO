import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildReviewedPreview } from './preview';
import {
  PENDING_CONTRADICTIONS,
  RECONCILIATION_JSON_PATH,
  STARTER_LIST_FILE,
  buildStarterReconciliation,
  canonicalReconciliationJson,
  historicalKeysFor,
  resolveCatalogKey,
  summarizeReconciliation,
} from './reconciliation';
import { stableProductId } from './stable-id';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const starterSource = readFileSync(join(repoRoot, STARTER_LIST_FILE), 'utf8');

function starterKeysFromSource(): { active: string[]; retired: string[] } {
  const active = [...starterSource.matchAll(/^\s*product\(\s*'([a-z0-9-]+)'/gm)].map((m) => m[1]!);
  const retiredBlock = starterSource.match(/RETIRED_STARTER_KEYS = \[([\s\S]*?)\]/)?.[1] ?? '';
  const retired = [...retiredBlock.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]!);
  return { active, retired };
}

describe('preview25 ↔ starter21 reconciliation', () => {
  const preview = buildReviewedPreview();
  const rows = buildStarterReconciliation();

  it('lists every starter key from the starter file, active and retired, exactly once', () => {
    const { active, retired } = starterKeysFromSource();
    assert.equal(active.length, 21);
    assert.equal(retired.length, 8);
    const listed = rows.map((row) => row.starterKey);
    assert.equal(new Set(listed).size, listed.length);
    assert.deepEqual(
      rows.filter((row) => row.origin === 'starter21_active').map((row) => row.starterKey).sort(),
      [...active].sort(),
    );
    assert.deepEqual(
      rows.filter((row) => row.origin === 'starter_retired').map((row) => row.starterKey).sort(),
      [...retired].sort(),
    );
  });

  it('maps each key to a stable catalog id or records an explicit reason', () => {
    const ids = new Set(preview.products.map((product) => product.id));
    for (const row of rows) {
      assert.ok(row.basis.length > 0, row.starterKey);
      assert.equal(row.pdfCheck.status, 'pending');
      if (row.outcome === 'unmatched') {
        assert.equal(row.catalogId, null);
        assert.equal(row.canonicalKey, null);
        continue;
      }
      assert.ok(row.canonicalKey);
      assert.equal(row.catalogId, stableProductId(row.canonicalKey!));
      assert.ok(ids.has(row.catalogId!), `${row.starterKey} → ${row.catalogId}`);
      if (row.outcome === 'matched') assert.equal(row.starterKey, row.canonicalKey);
      if (row.outcome === 'alias') assert.notEqual(row.starterKey, row.canonicalKey);
    }
  });

  it('keeps the recorded mapping for the alias and unmatched keys', () => {
    const outcome = (key: string) => rows.find((row) => row.starterKey === key);
    assert.equal(outcome('sanitario-capri')?.canonicalKey, 'inodoro-capri');
    assert.equal(outcome('sanitario-alti')?.canonicalKey, 'alti');
    assert.equal(outcome('urinario')?.canonicalKey, 'urinario-acqua');
    assert.equal(outcome('tanque-alto')?.outcome, 'unmatched');
    assert.ok(preview.unresolved.some((item) => item.name === 'Tanque Alto'));
  });

  it('active starter categories agree with the catalog category', () => {
    for (const row of rows.filter((item) => item.origin === 'starter21_active' && item.canonicalKey)) {
      const pattern = new RegExp(`product\\(\\s*'${row.starterKey}',\\s*'[^']+',\\s*'([A-Za-z]+)'`);
      const starterCategory = starterSource.match(pattern)?.[1]?.toLowerCase();
      const product = preview.products.find((item) => item.canonicalKey === row.canonicalKey);
      assert.equal(starterCategory, product?.category, row.starterKey);
    }
  });

  it('resolves aliases, retired keys, canonical keys and ids to one stable id', () => {
    const target = stableProductId('inodoro-capri');
    for (const key of ['sanitario-capri', 'inodoro-capri', target]) {
      const resolved = resolveCatalogKey(preview, key);
      assert.equal(resolved.found, true, key);
      if (resolved.found) assert.equal(resolved.catalogId, target);
    }
    const alias = resolveCatalogKey(preview, 'urinario');
    assert.ok(alias.found && alias.via === 'starter_alias');
    const retired = resolveCatalogKey(preview, 'bowl-luma');
    assert.ok(retired.found && retired.via === 'starter_retired');
    const unmatched = resolveCatalogKey(preview, 'tanque-alto');
    assert.equal(unmatched.found, false);
    if (!unmatched.found) assert.equal(unmatched.reason, 'unmatched_starter_key');
    assert.equal(resolveCatalogKey(preview, 'no-existe').found, false);
    assert.equal(resolveCatalogKey(preview, '  ').found, false);
  });

  it('never loses a historical key', () => {
    for (const row of rows.filter((item) => item.canonicalKey)) {
      assert.ok(historicalKeysFor(row.canonicalKey!).includes(row.starterKey), row.starterKey);
    }
    assert.deepEqual(historicalKeysFor('alti'), ['alti', 'sanitario-alti']);
  });

  it('records contradictions as pending, not resolved', () => {
    assert.ok(PENDING_CONTRADICTIONS.length >= 2);
    for (const item of PENDING_CONTRADICTIONS) {
      assert.equal(item.resolution, 'pending');
      assert.ok(item.sources.length > 0);
    }
  });

  it('summarizes counts and matches the committed reconciliation file', () => {
    const summary = summarizeReconciliation(preview, rows);
    assert.deepEqual(
      [summary.activeStarterKeys, summary.retiredStarterKeys, summary.matched, summary.alias, summary.unmatched],
      [21, 8, 25, 3, 1],
    );
    assert.equal(summary.catalogCandidates, 25);
    assert.equal(readFileSync(RECONCILIATION_JSON_PATH, 'utf8'), canonicalReconciliationJson(preview));
  });
});
