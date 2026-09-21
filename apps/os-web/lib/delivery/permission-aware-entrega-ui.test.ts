import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canRecordDelivery } from '@isalwa/os-contracts';
import { resolveEntregaHistoryPanel } from './surface';
import {
  canOperateEntregaDesk,
  canShowDeliveryNotePdf,
  deliveryPresentationScopes,
  omitDeliveryNotePdfWithoutRecord,
} from './permission-aware-ui';
import { filterDocumentLinksForProjection } from '../role-preview/evaluation-history-filter';
import type { EvaluationProjection } from '../role-preview/evaluation-projection-model';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

function projection(persona: EvaluationProjection['persona']): EvaluationProjection {
  return {
    active: true,
    persona,
    subjectMemberId: null,
    readOnly: true,
    commercialVisibility: null,
    presentationScopes: [],
  };
}

describe('permission-aware entrega UI', () => {
  it('does not deny the history panel to a member who can operate the desk', () => {
    assert.equal(
      resolveEntregaHistoryPanel({
        surfaceStatus: 'permission',
        fulfillmentReadDenied: true,
        canOperateDesk: true,
      }),
      'history-withheld',
    );
    assert.equal(
      resolveEntregaHistoryPanel({
        surfaceStatus: 'permission',
        fulfillmentReadDenied: true,
        canOperateDesk: false,
      }),
      'permission',
    );
    assert.equal(
      resolveEntregaHistoryPanel({
        surfaceStatus: 'ready',
        fulfillmentReadDenied: false,
        canOperateDesk: true,
      }),
      'ready',
    );
  });

  it('shows the delivery-note PDF only with delivery.record', () => {
    assert.equal(canShowDeliveryNotePdf(['delivery.record']), true);
    assert.equal(canShowDeliveryNotePdf(['warehouse.outbound.record']), false);
    assert.equal(canShowDeliveryNotePdf(['commercial.customer.create']), false);
    assert.equal(canOperateEntregaDesk(['warehouse.outbound.record']), true);
    assert.equal(canOperateEntregaDesk(['delivery.record']), true);
    assert.equal(canOperateEntregaDesk(['commercial.customer.create']), false);
    assert.deepEqual(
      omitDeliveryNotePdfWithoutRecord(
        [{ type: 'quote_pdf' }, { type: 'delivery_note_pdf' }],
        ['warehouse.outbound.record'],
      ).map((link) => link.type),
      ['quote_pdf'],
    );
    assert.equal(
      omitDeliveryNotePdfWithoutRecord([{ type: 'delivery_note_pdf' }], ['delivery.record']).length,
      1,
    );
  });

  it('keeps View As on the presentation lens and does not elevate it', () => {
    assert.deepEqual(
      deliveryPresentationScopes({
        grantedScopes: ['delivery.record', 'system.admin'],
        evaluationActive: true,
        presentationScopes: ['warehouse.finished_goods.receive'],
      }),
      ['warehouse.finished_goods.receive'],
    );
    assert.equal(
      canRecordDelivery(
        deliveryPresentationScopes({
          grantedScopes: ['commercial.customer.create'],
          evaluationActive: false,
          presentationScopes: ['delivery.record'],
        }),
      ),
      false,
    );
  });

  it('hides delivery-note PDF for Asesor and Almacén view-as, and keeps it for Entregas', () => {
    const docs = [{ type: 'quote_pdf' }, { type: 'delivery_note_pdf' }];
    assert.deepEqual(
      filterDocumentLinksForProjection(projection('asesor'), docs).map((link) => link.type),
      ['quote_pdf'],
    );
    assert.deepEqual(
      filterDocumentLinksForProjection(projection('almacen'), docs).map((link) => link.type),
      [],
    );
    assert.deepEqual(
      filterDocumentLinksForProjection(projection('entregas'), docs).map((link) => link.type),
      ['delivery_note_pdf'],
    );
  });

  it('gates the hosted PDF control and replaces the contradictory denial', () => {
    const docs = read('components/delivery/delivery-documents-panel.tsx');
    const desk = read('components/delivery/entrega-operational-write-desk.tsx');
    const panel = read('components/delivery/entrega-panel.tsx');
    const page = read('app/(app)/entregas/page.tsx');
    assert.match(docs, /canDownloadNotePdf \? \(/);
    assert.match(docs, /note\.status === 'issued' && allowNote/);
    assert.doesNotMatch(docs, /note\.status === 'issued' && canMutate/);
    assert.match(desk, /canDownloadNotePdf=\{canRecordDelivery\(scopes\)\}/);
    assert.match(panel, /data-entrega-boundary="history-withheld"/);
    assert.match(panel, /El historial de salidas y entregas no está en esta lectura\./);
    assert.equal(panel.split('No tiene permiso para ver este registro de entrega.').length, 2);
    assert.match(page, /resolveEntregaHistoryPanel/);
    assert.match(page, /view\.commercialReadDenied \? null/);
    const api = readFileSync(join(root, '../../apps/os-api/src/delivery.controller.ts'), 'utf8');
    assert.match(api, /@Get\(':id\/pdf'\)/);
    assert.doesNotMatch(api, /canDownloadNotePdf/);
  });
});
