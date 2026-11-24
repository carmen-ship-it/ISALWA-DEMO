import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PRODUCTION_NEXT_ACTION_TITLE_PREFIX,
  PRODUCTION_UPDATE_TITLE_PREFIX,
  WORK_REASSIGNMENT_PENDING_AUTHORITY,
  classifyWorkForReassignment,
  productionAnnotationMarker,
  productionNextActionMarker,
} from './work-reassignment';

const work = (subjectType: string | null, title: string, description: string | null = null) => ({
  subjectType,
  title,
  description,
});

describe('classifyWorkForReassignment (R4 23:47 §A)', () => {
  it('domain markers win over a customer subject', () => {
    assert.equal(classifyWorkForReassignment(work('party', 'COMPRAS', '[[order-prep:purchasing:o1]]')), 'purchasing');
    assert.equal(classifyWorkForReassignment(work('party', 'PRODUCCIÓN', '[[order-prep:production:o1]]')), 'production');
    assert.equal(classifyWorkForReassignment(work('party', 'ALMACÉN', '[[order-prep:warehouse:o1]]')), 'warehouse');
    assert.equal(classifyWorkForReassignment(work('party', 'x', '[[production-update:o1]]')), 'production');
    assert.equal(classifyWorkForReassignment(work('party', 'x', '[[compras-result:o1]]')), 'purchasing');
    assert.equal(classifyWorkForReassignment(work('party', 'x', productionNextActionMarker('o1'))), 'production');
    assert.equal(classifyWorkForReassignment(work('party', `${PRODUCTION_NEXT_ACTION_TITLE_PREFIX}: P-1 · Vidrio`)), 'production');
    assert.equal(classifyWorkForReassignment(work('party', 'x', productionAnnotationMarker('o1'))), 'production');
    assert.equal(classifyWorkForReassignment(work('party', `${PRODUCTION_UPDATE_TITLE_PREFIX}: P-1 · Vidrio`)), 'production');
  });

  it('subjects decide only when no marker is present', () => {
    assert.equal(classifyWorkForReassignment(work('party', 'Seguimiento')), 'customer');
    assert.equal(classifyWorkForReassignment(work('commercial_account', 'Seguimiento')), 'customer');
    assert.equal(classifyWorkForReassignment(work('work_item', 'Relacionado')), 'linked');
    assert.equal(classifyWorkForReassignment(work('organization_member', 'Alta')), 'general');
    assert.equal(classifyWorkForReassignment(work(null, 'Tarea')), 'general');
  });

  it('unknown or ambiguous fails closed', () => {
    assert.equal(classifyWorkForReassignment(work(null, 'x', '[[mystery:1]]')), 'unknown');
    assert.equal(classifyWorkForReassignment(work('party', 'x', '[[order-prep:finance:o1]]')), 'unknown');
    assert.equal(
      classifyWorkForReassignment(work('party', 'x', '[[order-prep:production:o1]] [[compras-result:o1]]')),
      'unknown',
    );
    assert.equal(classifyWorkForReassignment(work('quote', 'x')), 'unknown');
  });

  it('production, warehouse and purchasing are recorded as pending an authority definition', () => {
    assert.deepEqual([...WORK_REASSIGNMENT_PENDING_AUTHORITY].sort(), ['production', 'purchasing', 'warehouse']);
  });
});
