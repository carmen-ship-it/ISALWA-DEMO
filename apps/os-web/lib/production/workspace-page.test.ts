import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { PRODUCTION_PAGE_COPY, PRODUCTION_STEP_LABELS } from './copy';
import { productionInternalDateFact } from './dates';
import { searchProductIds } from './product-search';

const root = join(__dirname, '../..');
const page = readFileSync(join(root, 'app/(app)/produccion/page.tsx'), 'utf8');
const workspace = readFileSync(join(root, 'components/production/production-workspace.tsx'), 'utf8');
const surface = `${page}\n${workspace}\n${readFileSync(join(__dirname, 'copy.ts'), 'utf8')}`;

const EXACT_STEPS = [
  'Laboratorio (preparación de materia prima y esmalte)',
  'Molienda',
  'Colaje',
  'Secado',
  'Pulido',
  'Esmaltado',
  'Carga y Limpieza',
  'Horno',
  'Resane',
  'Clasificación',
  'Almacén de Productos Terminados',
] as const;

describe('production workspace page', () => {
  it('uses the Spanish step names and does not treat a pedido as the parent of a quema', () => {
    assert.match(page, /ProductionWorkspace/);
    assert.match(page, /PRODUCTION_STEP_LABELS/);
    assert.match(join(root, 'app/(app)/produccion/page.tsx'), /produccion\/page\.tsx$/);
    assert.equal(page.includes('clientes/') && page.includes('/pedidos/'), false);
    for (const label of EXACT_STEPS) {
      assert.equal(PRODUCTION_STEP_LABELS.includes(label), true, label);
      assert.equal(surface.includes(label), true, label);
    }
    assert.equal(page.includes('Una quema no es un pedido y no pertenece a un pedido.'), true);
    assert.equal(page.includes('Un ingreso al Almacén de Productos Terminados no asigna un pedido.'), true);
    assert.equal(surface.includes(PRODUCTION_PAGE_COPY.quemaNotParent), true);
    assert.equal(surface.includes(PRODUCTION_PAGE_COPY.receiptDoesNotAssign), true);
    assert.equal(/quema del pedido/i.test(surface), false);
    assert.equal(/pedido padre/i.test(surface), false);
    assert.equal(/pedido de la quema/i.test(surface), false);
    assert.equal(/parent order/i.test(surface), false);
    assert.equal(/completionPercent/.test(surface), false);
  });

  it('shows a production internal date only when that contract fact exists', () => {
    const fact = productionInternalDateFact(
      {
        organizationId: 'org-a',
        source: 'production_internal',
        targetOn: '2026-09-20T00:00:00.000Z',
      },
      'org-a',
      '2026-09-18T00:00:00.000Z',
    );
    assert.equal(fact?.label, 'Fecha interna de producción');
    assert.equal(fact?.targetOn, '2026-09-20T00:00:00.000Z');
    assert.notEqual(fact?.targetOn, '2026-09-18T00:00:00.000Z');
    assert.equal(
      productionInternalDateFact(null, 'org-a', '2026-09-18T00:00:00.000Z'),
      null,
    );
    assert.equal(surface.includes('No se copia la fecha con el cliente'), true);
  });

  it('does not invent catalog names when the catalog is empty', () => {
    assert.deepEqual(searchProductIds(null, 'lavamanos'), { namesAvailable: false, hits: [] });
    assert.deepEqual(searchProductIds([], 'lavamanos'), { namesAvailable: false, hits: [] });
    assert.equal(surface.includes(PRODUCTION_PAGE_COPY.catalogEmpty), true);
  });

  it('does not commit a raw typed product id and blocks annotate without catalog selection', () => {
    assert.match(page, /loadProductionCatalog/);
    assert.doesNotMatch(page, /catalog=\{null\}/);
    assert.match(workspace, /selectCatalogHit/);
    assert.match(workspace, /productRequiredForTab && !productFromCatalog/);
    assert.match(workspace, /catalogContainsProductId/);
    assert.doesNotMatch(workspace, /selectProductId\(productQuery\)/);
    assert.doesNotMatch(workspace, /Identificador de producto/);
    assert.doesNotMatch(workspace, /escriba el identificador/i);
    assert.match(PRODUCTION_PAGE_COPY.catalogEmpty, /No se anota con un identificador escrito a mano/);
  });
});
