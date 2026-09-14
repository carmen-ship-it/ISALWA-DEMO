import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  FORBIDDEN_PRODUCT_FIELDS,
  TECHNICAL_ATTRIBUTE_KEYS,
  findForbiddenProductFields,
} from '../../os-contracts/src/product-catalog';
import { MemoryProductCatalog, ProductCatalogError } from './catalog';
import { buildReviewedPreview, canonicalPreviewJson, PREVIEW_JSON_PATH } from './preview';
import { stableProductId } from './stable-id';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../..');
const migrationPath = join(
  repoRoot,
  'packages/os-database/prisma/migrations/20260915100000_os_product_catalog/migration.sql',
);
const fragmentPath = join(repoRoot, 'packages/os-database/prisma/fragments/product-catalog.prisma');

const registeredAt = '2026-09-14T15:00:00.000Z';
const deactivatedAt = '2026-09-15T12:00:00.000Z';

function columnNames(sql: string): string[] {
  const tables = sql.split(/CREATE TABLE /).slice(1);
  const names: string[] = [];
  for (const table of tables) {
    const body = table.split(/CONSTRAINT |PRIMARY KEY|FOREIGN KEY|UNIQUE /)[0] ?? '';
    for (const line of body.split('\n')) {
      const match = line.trim().match(/^([a-z_]+)\s+/);
      if (match?.[1] && match[1] !== 'create') names.push(match[1]);
    }
  }
  return names;
}

describe('product catalog preview', () => {
  it('keeps stable ids and rebuilds the same preview', () => {
    const first = buildReviewedPreview();
    const second = buildReviewedPreview();
    assert.equal(canonicalPreviewJson(first), canonicalPreviewJson(second));
    assert.equal(first.importExecuted, false);
    assert.equal(first.isPriceList, false);
    assert.equal(first.productCount, first.products.length);

    const keys = new Set<string>();
    for (const product of first.products) {
      assert.equal(product.id, stableProductId(product.canonicalKey));
      assert.equal(keys.has(product.id), false);
      keys.add(product.id);
      assert.equal(product.businessCode, null);
      assert.equal(product.active, true);
    }

    const onDisk = readFileSync(PREVIEW_JSON_PATH, 'utf8');
    assert.equal(onDisk, canonicalPreviewJson(first));
  });

  it('cites a filename and page on every product and refuses invented commercial fields', () => {
    const preview = buildReviewedPreview();
    const hashes = new Map(preview.sources.map((source) => [source.filename, source.sha256]));
    assert.equal(hashes.get('CatalogoVitriCompleto2026.pdf'), '4de2f923f96942fa0f2612d857b11e8aa20bf42e5129e931e9ee834de16c25b0');
    assert.equal(hashes.get('Vitri2026.2027.pdf'), '3adf82c24ce25120ee6a33f00becc1fbdbc1a7908a55e0b58c4312de7ed87ceb');
    assert.deepEqual(findForbiddenProductFields(preview), []);

    for (const product of preview.products) {
      assert.ok(product.provenance.length > 0);
      for (const citation of product.provenance) {
        assert.equal(hashes.get(citation.sourceFilename), citation.sourceSha256);
        assert.equal(Number.isInteger(citation.page) && citation.page > 0, true);
        assert.ok(citation.excerpt.length > 0);
      }
    }

    assert.equal(preview.printedLabelsWithoutAmount.every((label) => label.amount === null), true);
    const names = preview.products.map((product) => product.name);
    assert.equal(names.filter((name) => name === 'Set Capri').length, 1);
    assert.equal(names.filter((name) => name === 'Sanitario Capri').length, 1);
    assert.equal(names.filter((name) => name === 'Tanque Capri').length, 1);
    assert.equal(names.includes('Tanque Alto'), false);
  });

  it('has no price columns in the migration or fragment', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    const fragment = readFileSync(fragmentPath, 'utf8');
    const columns = [...columnNames(sql), ...fragment.split('\n').map((line) => line.trim())];
    for (const field of FORBIDDEN_PRODUCT_FIELDS) {
      assert.equal(
        columns.some((column) => column.toLowerCase() === field.toLowerCase()),
        false,
        field,
      );
    }
    for (const key of TECHNICAL_ATTRIBUTE_KEYS) {
      assert.match(sql, new RegExp(`'${key}'`));
    }
    assert.match(sql, /os_catalog_products are not deleted/);
    assert.doesNotMatch(sql, /INSERT INTO/i);
  });
});

describe('tenant product catalog', () => {
  it('isolates organizations and keeps history when a product is deactivated', () => {
    const preview = buildReviewedPreview();
    const catalog = new MemoryProductCatalog();
    const first = catalog.registerPreview('org-a', preview, registeredAt);
    const again = catalog.registerPreview('org-a', preview, '2026-09-14T16:00:00.000Z');
    assert.equal(first.length, preview.products.length);
    assert.equal(again.length, preview.products.length);
    assert.equal(catalog.list('org-a').length, preview.products.length);
    assert.equal(catalog.list('org-a')[0]?.statusHistory.length, 1);

    catalog.registerPreview('org-b', preview, registeredAt);
    const sample = preview.products[0];
    assert.ok(sample);
    const inA = catalog.get('org-a', sample.id);
    const inB = catalog.get('org-b', sample.id);
    assert.equal(inA?.id, sample.id);
    assert.equal(inB?.id, sample.id);
    assert.equal(inA?.organizationId, 'org-a');
    assert.equal(inB?.organizationId, 'org-b');
    assert.notEqual(inA, inB);

    const deactivated = catalog.deactivate('org-a', sample.id, deactivatedAt);
    assert.equal(deactivated.id, sample.id);
    assert.equal(deactivated.active, false);
    assert.equal(deactivated.deactivatedAt, deactivatedAt);
    assert.deepEqual(deactivated.provenance, inA?.provenance);
    assert.equal(deactivated.statusHistory.length, 2);
    assert.equal(deactivated.statusHistory[0]?.reason, 'registered');
    assert.equal(deactivated.statusHistory[1]?.reason, 'deactivated');
    assert.equal(catalog.list('org-a').some((row) => row.id === sample.id), true);
    assert.equal(catalog.get('org-b', sample.id)?.active, true);
    assert.equal(catalog.get('org-b', sample.id)?.statusHistory.length, 1);

    assert.throws(
      () => catalog.deactivate('org-b', 'prd_missing', deactivatedAt),
      (error: unknown) => error instanceof ProductCatalogError && error.code === 'product_not_in_organization',
    );
    assert.equal(catalog.list('org-c').length, 0);
  });
});
