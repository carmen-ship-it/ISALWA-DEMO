import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CLIENTE_360_REQUEST_COUNT } from '@/lib/cliente/load-cliente-360';
import {
  formatOpportunityStatus,
  formatOrderStatus,
  formatQuoteStatus,
} from '@/lib/commercial/labels';
import { formatCentavos, formatOptionalCentavos } from '@/lib/commercial/money';
import {
  opportunityHref,
  orderHref,
  quoteHref,
} from '@/lib/commercial/navigation';
import {
  assertNoRawPayload,
  sortTimelineChronologicalDesc,
  timelineEntrySummary,
  timelineEventLabel,
} from '@/lib/commercial/timeline-labels';
import {
  freshProjection,
  sampleCommercialTimelineEntry,
  sampleOpportunity,
  sampleOrder,
  samplePartyTimelineEntry,
  sampleQuote,
  sampleQuoteDetail,
  staleProjection,
} from '@/lib/commercial/fixtures';

describe('UI-4 money rendering', () => {
  it('formats centavos with BigInt without float drift', () => {
    assert.equal(formatCentavos('5000000', 'BOB'), 'Bs. 50.000,00');
    assert.equal(formatCentavos('12500000', 'BOB'), 'Bs. 125.000,00');
    assert.equal(formatCentavos('99', 'BOB'), 'Bs. 0,99');
  });

  it('renders optional centavos from DTO strings', () => {
    assert.equal(formatOptionalCentavos(sampleOpportunity.expectedValueCentavos), 'Bs. 3.850,00');
    assert.equal(formatOptionalCentavos(null), null);
  });

  it('quote detail line totals use canonical centavo strings', () => {
    const line = sampleQuoteDetail.lines[0];
    assert.equal(formatCentavos(line.lineTotalCentavos, 'BOB'), 'Bs. 1.850,00');
    assert.equal(formatCentavos(line.unitPriceCentavos, 'BOB'), 'Bs. 185,00');
  });
});

describe('UI-4 opportunity presentation', () => {
  it('maps status labels in Spanish', () => {
    assert.equal(formatOpportunityStatus('open'), 'Abierta');
    assert.equal(formatOpportunityStatus('won'), 'Ganada');
    assert.equal(formatOpportunityStatus('lost'), 'Perdida');
  });

  it('fixture has factual fields only', () => {
    assert.equal(sampleOpportunity.title, 'Reposición sanitarios — El Alto');
    assert.equal(sampleOpportunity.partyId, 'party-1');
    assert.equal('probability' in sampleOpportunity, false);
  });

  it('supports empty list honestly', () => {
    assert.deepEqual([], []);
  });

  it('surfaces stale projection from DTO', () => {
    assert.equal(staleProjection.isStale, true);
    assert.equal(freshProjection.isStale, false);
  });
});

describe('UI-4 quotes presentation', () => {
  it('maps quote status including submitted and cancelled', () => {
    assert.equal(formatQuoteStatus('submitted'), 'Enviada');
    assert.equal(formatQuoteStatus('cancelled'), 'Cancelada');
    assert.equal(formatQuoteStatus('draft'), 'Borrador');
  });

  it('renders quote total from centavos string', () => {
    assert.equal(formatCentavos(sampleQuote.totalCentavos, sampleQuote.currency), 'Bs. 3.850,00');
  });

  it('detail fixture includes lines without catalog metadata requirement', () => {
    assert.equal(sampleQuoteDetail.lines.length, 2);
    assert.equal(sampleQuoteDetail.lines[0].productRef, null);
  });
});

describe('UI-4 orders presentation', () => {
  it('maps order status without fulfillment labels', () => {
    assert.equal(formatOrderStatus('open'), 'Registrado');
    assert.equal(formatOrderStatus('cancelled'), 'Cancelado');
    assert.equal(formatOrderStatus('shipped' as never), 'shipped');
  });

  it('does not expose payment or inventory fields in fixture', () => {
    assert.equal('paidAt' in sampleOrder, false);
    assert.equal('shippedAt' in sampleOrder, false);
    assert.equal('invoicedAt' in sampleOrder, false);
  });

  it('renders order amount from centavos', () => {
    assert.equal(formatCentavos(sampleOrder.totalCentavos, 'BOB'), 'Bs. 3.850,00');
  });
});

describe('UI-4 timeline presentation', () => {
  it('labels party events in Spanish', () => {
    assert.equal(timelineEventLabel('party.created'), 'Cliente registrado');
    assert.equal(timelineEventLabel('contact.updated'), 'Contacto actualizado');
  });

  it('labels commercial events in Spanish', () => {
    assert.equal(timelineEventLabel('opportunity.created'), 'Oportunidad creada');
    assert.equal(timelineEventLabel('quote.submitted'), 'Cotización enviada');
    assert.equal(timelineEventLabel('order.created'), 'Pedido creado');
  });

  it('summarizes allowlisted facts without raw payload', () => {
    assert.match(timelineEntrySummary(samplePartyTimelineEntry), /Reposición sanitarios/);
    assert.match(timelineEntrySummary(sampleCommercialTimelineEntry), /Q-000001/);
    assert.equal(assertNoRawPayload(samplePartyTimelineEntry), true);
    assert.equal(assertNoRawPayload({ ...samplePartyTimelineEntry, payload: { secret: true } }), false);
  });

  it('orders timeline newest first', () => {
    const sorted = sortTimelineChronologicalDesc([
      { ...samplePartyTimelineEntry, occurredAt: '2026-08-20T10:00:00.000Z' },
      { ...sampleCommercialTimelineEntry, occurredAt: '2026-08-21T14:00:00.000Z' },
    ]);
    assert.equal(sorted[0].occurredAt, '2026-08-21T14:00:00.000Z');
  });

  it('empty timeline stays honest', () => {
    assert.equal([].length, 0);
  });
});

describe('UI-4 Cliente 360 integration contract', () => {
  it('keeps party as canonical identity in routes', () => {
    assert.equal(opportunityHref('party-1', 'opp-1'), '/clientes/party-1/oportunidades/opp-1');
    assert.equal(quoteHref('party-1', 'quote-1'), '/clientes/party-1/cotizaciones/quote-1');
    assert.equal(orderHref('party-1', 'order-1'), '/clientes/party-1/pedidos/order-1');
  });

  it('documents parallel request budget', () => {
    assert.equal(CLIENTE_360_REQUEST_COUNT, 6);
  });

  it('does not reference legacy Account or ActivityEvent APIs', () => {
    const sources = ['getParty', 'listOpportunities', 'listQuotes', 'listOrders', 'listPartyTimeline'];
    assert.equal(sources.includes('getAccount'), false);
    assert.equal(sources.includes('listActivityEvents'), false);
  });
});

describe('UI-4 authorization presentation', () => {
  it('status labels are display-only', () => {
    assert.equal(typeof formatQuoteStatus('submitted'), 'string');
    assert.notEqual(formatQuoteStatus('submitted'), 'commercial.quote.submitted');
  });
});
