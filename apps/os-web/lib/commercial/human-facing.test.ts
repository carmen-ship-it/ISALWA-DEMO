import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { presentStage } from './labels';
import {
  presentDeliveryNoteLabel,
  presentDeliveryNoteReference,
  presentProductRef,
  scrubPilotDeliveryNoteRefs,
} from './human-facing';
import { SPECIAL_ITEM_LABEL } from './product-picker';

describe('human-facing commercial display', () => {
  it('maps raw stage open through the existing status label', () => {
    assert.equal(presentStage('open'), 'Abierta');
    assert.equal(presentStage('open', 'opportunity'), 'Abierta');
    assert.equal(presentStage('open', 'order'), 'Registrado');
    assert.equal(presentStage('propuesta'), 'propuesta');
    assert.notEqual(presentStage('open'), 'open');
  });

  it('shows the special-item label for off-catalog refs without changing other refs', () => {
    assert.equal(
      presentProductRef('off-catalog:fuera-de-catalogo'),
      SPECIAL_ITEM_LABEL,
    );
    assert.equal(presentProductRef('off-catalog:fuera-de-catalogo:nota'), 'Ítem especial / fuera de catálogo');
    assert.equal(presentProductRef('SKU-LAV'), 'SKU-LAV');
    assert.equal(presentProductRef(null), null);
    assert.equal(presentProductRef('off-catalog:fuera-de-catalogo'), SPECIAL_ITEM_LABEL);
  });

  it('hides NE-PILOT refs and does not invent a fiscal series', () => {
    const label = presentDeliveryNoteLabel({
      internalDocumentRef: 'NE-PILOT-01M2RJRGHD8MRNNCGZ6ZMQRFT0',
      orderNumber: 'O-000005',
    });
    assert.equal(label, 'Nota de entrega · Pedido O-000005');
    assert.doesNotMatch(label, /NE-PILOT|NE-0001/);
    assert.equal(
      presentDeliveryNoteLabel({ internalDocumentRef: 'NE-PILOT-abc' }),
      'Nota de entrega',
    );
    assert.equal(
      presentDeliveryNoteLabel({
        internalDocumentRef: 'NE-PILOT-abc',
        orderNumber: '01M2RJRGHD8MRNNCGZ6ZMQRFT0',
      }),
      'Nota de entrega',
    );
    assert.equal(
      presentDeliveryNoteReference({
        internalDocumentRef: 'NE-PILOT-abc',
        orderNumber: 'O-000005',
      }),
      'Nota de entrega · Pedido O-000005',
    );
    assert.equal(
      presentDeliveryNoteLabel({ internalDocumentRef: 'NE-DEMO-MADERAS', orderNumber: 'O-000002' }),
      'Nota de entrega NE-DEMO-MADERAS',
    );
    assert.equal(
      presentDeliveryNoteReference({ internalDocumentRef: 'NE-DEMO-MADERAS' }),
      'NE-DEMO-MADERAS',
    );
    assert.equal(
      scrubPilotDeliveryNoteRefs('Documento: NE-PILOT-note-1', 'O-000005'),
      'Documento: Nota de entrega · Pedido O-000005',
    );
  });
});
