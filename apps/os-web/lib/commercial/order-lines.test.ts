import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import {
  ORDER_LINES_NOT_INVENTED,
  ORDER_LINES_NOT_RECORDED,
  ORDER_LINES_TITLE,
  presentOrderLines,
  type OrderLineView,
} from './order-lines';

const line: OrderLineView = {
  orderLineId: 'ol-1',
  quoteId: 'quote-1',
  quoteLineId: 'ql-1',
  lineNumber: 2,
  description: 'Lavamanos cerámico',
  quantity: 2,
  unitLabel: 'pza',
  unitPriceCentavos: '150000',
  discountCentavos: '5000',
  lineTotalCentavos: '295000',
  productRef: 'SKU-LAV',
};

describe('order line presentation', () => {
  it('shows copied lines without rebuilding the price', () => {
    const presented = presentOrderLines([
      { ...line, lineNumber: 2 },
      { ...line, orderLineId: 'ol-0', lineNumber: 1, description: 'Primera' },
    ]);
    assert.equal(presented.recorded, true);
    assert.equal(presented.title, 'Líneas');
    if (!presented.recorded) return;
    assert.deepEqual(
      presented.lines.map((item) => item.description),
      ['Primera', 'Lavamanos cerámico'],
    );
    assert.equal(presented.lines[1].unitPriceCentavos, '150000');
    assert.equal(presented.lines[1].lineTotalCentavos, '295000');
    assert.equal(presented.lines[1].quoteLineId, 'ql-1');
  });

  it('keeps a legacy order readable and says the lines were not recorded', () => {
    for (const missing of [undefined, null, []] as const) {
      const presented = presentOrderLines(missing);
      assert.equal(presented.recorded, false);
      assert.equal(presented.title, ORDER_LINES_TITLE);
      if (presented.recorded) continue;
      assert.equal(presented.message, ORDER_LINES_NOT_RECORDED);
      assert.equal(presented.note, ORDER_LINES_NOT_INVENTED);
      assert.deepEqual(presented.lines, []);
    }
  });

  it('does not call the missing detail ready or a projection', () => {
    const helper = readFileSync(resolve(__dirname, 'order-lines.ts'), 'utf8');
    const component = readFileSync(
      resolve(__dirname, '../../components/commercial/order-lines.tsx'),
      'utf8',
    );
    const page = readFileSync(
      resolve(__dirname, '../../app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx'),
      'utf8',
    );
    assert.match(helper, /Las líneas de este pedido no se registraron/);
    assert.match(helper, /No se inventaron líneas/);
    assert.match(component, /pedido/i);
    assert.match(component, /Líneas del pedido/);
    assert.match(component, /presentOrderLines/);
    assert.match(page, /<OrderLines/);
    assert.doesNotMatch(component, /Listo|proyección|projection|totalCentavos/);
    assert.doesNotMatch(helper, /Listo|proyección|projection/);
    assert.doesNotMatch(page.slice(page.indexOf('<OrderLines')), /Listo/);
  });
});
