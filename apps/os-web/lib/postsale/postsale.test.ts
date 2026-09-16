import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPostSalePedidoOption,
  buildPostSalePedidoOptions,
  findPostSalePedido,
  productOptionsForPedido,
  resolveLineProduct,
} from './pedido-context';
import { buildProductionExpectedDateWork } from './expected-date-work';

describe('post-sale Pedido handoff', () => {
  it('builds human-readable Pedido options without opaque-only labels', () => {
    const option = buildPostSalePedidoOption({
      organizationId: 'org-a',
      orderId: 'ord-1',
      orderNumber: 'P-100',
      partyId: 'party-1',
      customerLabel: 'Cerámica Andina',
      quoteId: 'q-1',
      quoteNumber: 'C-55',
      ownerLabel: 'Ana',
      statusLabel: 'Abierto',
      lines: [
        { orderLineId: 'line-1', productRef: 'prod-bowl', description: 'Bowl 20', quantity: 12 },
        { orderLineId: 'line-2', description: 'Taza', quantity: 6 },
      ],
    });
    assert.ok(option);
    assert.equal(option?.optionLabel, 'Cerámica Andina · P-100');
    assert.equal(option?.quoteLabel, 'C-55');
    assert.equal(option?.lines[0]?.optionLabel, 'Bowl 20 · 12');
    assert.equal(option?.lines[1]?.productId, 'line-2');
    assert.doesNotMatch(option?.optionLabel ?? '', /^ord-/);
  });

  it('rejects incomplete Pedido rows and sorts options', () => {
    const options = buildPostSalePedidoOptions([
      {
        organizationId: 'org-a',
        orderId: 'ord-b',
        orderNumber: 'P-2',
        partyId: 'party-1',
        customerLabel: 'Beta',
        lines: [{ orderLineId: 'l1', description: 'A', quantity: 1 }],
      },
      {
        organizationId: 'org-a',
        orderId: 'ord-a',
        orderNumber: 'P-1',
        partyId: 'party-1',
        customerLabel: 'Alpha',
        lines: [{ orderLineId: 'l2', description: 'B', quantity: 2 }],
      },
      {
        organizationId: 'org-a',
        orderId: 'ord-empty',
        partyId: 'party-1',
        lines: [],
      },
    ]);
    assert.equal(options.length, 2);
    assert.equal(options[0]?.customerLabel, 'Alpha');
    assert.equal(findPostSalePedido(options, 'ord-b')?.orderLabel, 'P-2');
    assert.equal(findPostSalePedido(options, 'missing'), null);
  });

  it('inherits product from Pedido line without retyping', () => {
    const pedido = buildPostSalePedidoOption({
      organizationId: 'org-a',
      orderId: 'ord-1',
      orderNumber: 'P-100',
      partyId: 'party-1',
      customerLabel: 'Cliente',
      lines: [{ orderLineId: 'line-1', productRef: 'prod-1', description: 'Bowl', quantity: 3 }],
    });
    const products = productOptionsForPedido(pedido);
    assert.equal(products[0]?.id, 'line-1');
    const line = resolveLineProduct(pedido, 'line-1');
    assert.equal(line?.productId, 'prod-1');
    assert.equal(resolveLineProduct(pedido, 'nope'), null);
  });

  it('states human Pedido link provenance without automatic ownership', async () => {
    const { POSTSALE_HANDOFF_COPY, PRODUCTION_PEDIDO_LINK_PROVENANCE } = await import('./pedido-context');
    assert.match(POSTSALE_HANDOFF_COPY.humanLinkProvenance, /selección humana/i);
    assert.doesNotMatch(POSTSALE_HANDOFF_COPY.humanLinkProvenance, /propiedad automática|dueño automático/i);
    assert.equal(PRODUCTION_PEDIDO_LINK_PROVENANCE, 'human_selected_pedido_context');
  });
});

describe('production expected date → Work/Attention', () => {
  it('omits Work when no expected date is recorded', () => {
    const result = buildProductionExpectedDateWork({
      annotation: 'Secado confirmado',
      ownerMemberId: 'mem-1',
      partyId: 'party-1',
      orderId: 'ord-1',
      orderLabel: 'P-100',
      productLabel: 'Bowl',
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.work, null);
    assert.equal(result.annotation, 'Secado confirmado');
  });

  it('builds CreateWorkItem with dueAt on the customer party', () => {
    const result = buildProductionExpectedDateWork({
      annotation: 'Esperar esmaltado',
      note: 'Horno 2',
      expectedAt: '2026-10-01T09:00',
      ownerMemberId: 'mem-1',
      partyId: 'party-1',
      orderId: 'ord-1',
      orderLabel: 'P-100',
      productLabel: 'Bowl',
      orderLineId: 'line-1',
    });
    assert.equal(result.ok, true);
    if (!result.ok || !result.work) {
      assert.fail('expected work payload');
      return;
    }
    assert.equal(result.work.command, 'CreateWorkItem');
    assert.equal(result.work.payload.subjectType, 'party');
    assert.equal(result.work.payload.subjectId, 'party-1');
    assert.equal(typeof result.work.payload.dueAt, 'string');
    assert.match(String(result.work.payload.title), /P-100/);
    assert.match(String(result.work.payload.description), /Esperar esmaltado/);
  });

  it('fails closed on missing Pedido/customer/product or invalid date', () => {
    assert.equal(
      buildProductionExpectedDateWork({
        annotation: '',
        ownerMemberId: 'mem-1',
        partyId: 'party-1',
        orderId: 'ord-1',
        orderLabel: 'P-100',
        productLabel: 'Bowl',
      }).ok,
      false,
    );
    assert.equal(
      buildProductionExpectedDateWork({
        annotation: 'ok',
        ownerMemberId: 'mem-1',
        partyId: '',
        orderId: 'ord-1',
        orderLabel: 'P-100',
        productLabel: 'Bowl',
        expectedAt: '2026-10-01T09:00',
      }).ok,
      false,
    );
    assert.equal(
      buildProductionExpectedDateWork({
        annotation: 'ok',
        ownerMemberId: 'mem-1',
        partyId: 'party-1',
        orderId: 'ord-1',
        orderLabel: 'P-100',
        productLabel: 'Bowl',
        expectedAt: 'not-a-date',
      }).ok,
      false,
    );
  });
});
