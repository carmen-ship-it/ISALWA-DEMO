import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  composeCommercialFunnelCounts,
  composeOrgMetricCards,
  resolveManagementPeriod,
} from './org-metrics';

describe('composeOrgMetricCards', () => {
  it('separates Valor cotizado and Valor de pedidos from counts and never says revenue', () => {
    const period = resolveManagementPeriod('30', undefined, undefined, new Date('2026-09-17T12:00:00Z'));
    const cards = composeOrgMetricCards({
      period,
      opportunities: [
        {
          opportunityId: 'o1',
          status: 'open',
          expectedValueCentavos: '15000',
        } as never,
      ],
      quotes: [
        {
          quoteId: 'q1',
          submittedAt: '2026-09-10T12:00:00Z',
          cancelledAt: null,
          totalCentavos: '25000',
        } as never,
      ],
      orders: [
        {
          orderId: 'ord1',
          quoteId: 'q1',
          createdAt: '2026-09-12T12:00:00Z',
          totalCentavos: '25000',
          status: 'confirmed',
        } as never,
      ],
      overdueFollowUps: [],
      openIssues: [],
      pendingApprovals: [],
    });

    const byId = Object.fromEntries(cards.map((card) => [card.id, card]));
    assert.equal(byId['issued-quotes']?.value, '1');
    assert.equal(byId['quoted-value']?.label, 'Valor cotizado');
    assert.match(byId['quoted-value']?.value ?? '', /Bs|BOB|25/);
    assert.equal(byId['orders']?.value, '1');
    assert.equal(byId['order-value']?.label, 'Valor de pedidos');
    assert.match(byId['order-value']?.tooltip ?? '', /No es ingreso/);
    assert.doesNotMatch(
      cards.map((card) => `${card.label} ${card.value} ${card.tooltip ?? ''}`).join(' '),
      /revenue|ingresos oficiales|facturaci[oó]n/i,
    );

    const funnel = composeCommercialFunnelCounts({
      period,
      opportunities: [{ opportunityId: 'o1', status: 'open' } as never],
      quotes: [
        {
          quoteId: 'q1',
          submittedAt: '2026-09-10T12:00:00Z',
          cancelledAt: null,
          totalCentavos: '25000',
        } as never,
      ],
      orders: [
        {
          orderId: 'ord1',
          quoteId: 'q1',
          createdAt: '2026-09-12T12:00:00Z',
          totalCentavos: '25000',
          status: 'confirmed',
        } as never,
      ],
    });
    assert.deepEqual(funnel, { opportunities: 1, quotes: 1, orders: 1 });
  });
});
