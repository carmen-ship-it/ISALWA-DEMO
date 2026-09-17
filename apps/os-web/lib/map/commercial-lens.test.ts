import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildMapCommercialPortfolio,
  buildMapPartyCommercialSnapshot,
  MAP_COMMERCIAL_VALUE_DISCLAIMER,
} from './commercial-lens';
import { MAP_LAYER_REGISTRY, resolveMapLayer } from './layers';

describe('map commercial lens', () => {
  const baseOpp = {
    organizationId: 'org',
    commercialAccountId: null,
    ownerMemberId: 'm1',
    title: 'Opp',
    stage: 'open',
    status: 'open',
    closedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const baseQuote = {
    organizationId: 'org',
    commercialAccountId: null,
    opportunityId: null,
    ownerMemberId: 'm1',
    quoteNumber: 'Q-1',
    status: 'draft',
    currency: 'BOB',
    subtotalCentavos: '10000',
    headerDiscountCentavos: '0',
    totalCentavos: '10000',
    revisionNumber: 1,
    notes: null,
    submittedAt: null,
    cancelledAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const baseOrder = {
    organizationId: 'org',
    commercialAccountId: null,
    quoteId: 'q1',
    ownerMemberId: 'm1',
    orderNumber: 'P-1',
    status: 'open',
    currency: 'BOB',
    subtotalCentavos: '20000',
    headerDiscountCentavos: '0',
    totalCentavos: '20000',
    cancelledAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('sums safe commercial values without revenue labels', () => {
    const portfolio = buildMapCommercialPortfolio({
      opportunities: [
        {
          ...baseOpp,
          opportunityId: 'o1',
          partyId: 'p1',
          expectedValueCentavos: '15000',
        },
        {
          ...baseOpp,
          opportunityId: 'o2',
          partyId: 'p2',
          expectedValueCentavos: null,
          status: 'cancelled',
        },
      ],
      quotes: [
        { ...baseQuote, quoteId: 'q1', partyId: 'p1', totalCentavos: '10000' },
        { ...baseQuote, quoteId: 'q2', partyId: 'p1', totalCentavos: '5000', status: 'cancelled' },
      ],
      orders: [{ ...baseOrder, orderId: 'ord1', partyId: 'p1', totalCentavos: '20000' }],
      clientCount: 5,
      partial: false,
    });

    assert.equal(portfolio.clientCount, 5);
    assert.equal(portfolio.opportunityCount, 1);
    assert.equal(portfolio.quoteCount, 1);
    assert.equal(portfolio.orderCount, 1);
    assert.equal(portfolio.opportunityValueLabel, 'Bs. 150,00');
    assert.equal(portfolio.quotedValueLabel, 'Bs. 100,00');
    assert.equal(portfolio.orderValueLabel, 'Bs. 200,00');
    assert.equal(portfolio.partyIdsWithOpportunities.has('p1'), true);
    assert.equal(portfolio.partyIdsWithQuotes.has('p1'), true);
    assert.doesNotMatch(portfolio.opportunityValueLabel ?? '', /ingreso|facturaci/i);
    assert.match(MAP_COMMERCIAL_VALUE_DISCLAIMER, /No es ingreso/i);
    assert.match(MAP_COMMERCIAL_VALUE_DISCLAIMER, /facturaci[oó]n/i);
  });

  it('scopes party snapshot to one customer', () => {
    const input = {
      opportunities: [
        { ...baseOpp, opportunityId: 'o1', partyId: 'p1', expectedValueCentavos: '100' },
        { ...baseOpp, opportunityId: 'o2', partyId: 'p2', expectedValueCentavos: '999' },
      ],
      quotes: [{ ...baseQuote, quoteId: 'q1', partyId: 'p2' }],
      orders: [{ ...baseOrder, orderId: 'ord1', partyId: 'p1' }],
      partial: false,
    };
    const snap = buildMapPartyCommercialSnapshot('p1', input);
    assert.equal(snap.opportunityCount, 1);
    assert.equal(snap.quoteCount, 0);
    assert.equal(snap.orderCount, 1);
    assert.equal(snap.opportunityValueLabel, 'Bs. 1,00');
    assert.equal(snap.orderValueLabel, 'Bs. 200,00');
  });
});

describe('map layers — commercial filters available without inventing geography', () => {
  it('exposes clientes + attention + commercial record filters; keeps revenue layers unavailable', () => {
    const available = MAP_LAYER_REGISTRY.filter((layer) => layer.truthClass === 'available').map(
      (layer) => layer.id,
    );
    assert.deepEqual(available, [
      'clientes',
      'atencion',
      'oportunidades',
      'cotizaciones',
      'pedidos',
    ]);
    assert.equal(resolveMapLayer('atencion'), 'atencion');
    assert.equal(resolveMapLayer('cobranza'), 'clientes');
    assert.equal(resolveMapLayer('ingresos'), 'clientes');
    assert.equal(resolveMapLayer('oportunidades'), 'oportunidades');
  });
});
