import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMMERCIAL_NEXT_STEP_LABEL,
  opportunityNextStep,
  orderNextStep,
  quoteNextStep,
} from './next-step';

describe('commercial next-step', () => {
  it('labels the strip in Spanish', () => {
    assert.equal(COMMERCIAL_NEXT_STEP_LABEL, 'Próximo paso');
  });

  it('points an open opportunity at a new quote', () => {
    const step = opportunityNextStep({
      status: 'open',
      partyId: 'party-1',
      opportunityId: 'opp-1',
      newQuoteHref: '/clientes/party-1/oportunidades/opp-1/cotizaciones/nueva',
    });
    assert.equal(step?.hrefLabel, 'Nueva cotización');
    assert.equal(step?.waiting, false);
    assert.match(step?.statement ?? '', /cotización/i);
  });

  it('does not invent a call or visit for a closed opportunity', () => {
    const step = opportunityNextStep({
      status: 'lost',
      partyId: 'party-1',
      opportunityId: 'opp-1',
      newQuoteHref: '/x',
    });
    assert.equal(step?.waiting, true);
    assert.doesNotMatch(step?.statement ?? '', /llamar|whatsapp|visita/i);
  });

  it('keeps draft quotes on complete-and-send without inventing approval', () => {
    const step = quoteNextStep({
      status: 'draft',
      partyId: 'party-1',
      quoteId: 'quote-1',
      canConvertToOrder: false,
      relatedOrderHref: null,
      relatedOrderLabel: null,
      hasPendingApproval: false,
      canRegisterFollowUp: false,
      followUpHref: null,
    });
    assert.equal(step?.waiting, false);
    assert.match(step?.statement ?? '', /envíe/i);
    assert.doesNotMatch(step?.statement ?? '', /aprobación|pedido/i);
  });

  it('explains pending approval without claiming a pedido was created', () => {
    const step = quoteNextStep({
      status: 'submitted',
      partyId: 'party-1',
      quoteId: 'quote-1',
      canConvertToOrder: false,
      relatedOrderHref: null,
      relatedOrderLabel: null,
      hasPendingApproval: true,
      canRegisterFollowUp: true,
      followUpHref: '/clientes/party-1#trabajo',
    });
    assert.equal(step?.waiting, true);
    assert.match(step?.statement ?? '', /aprobación pendiente/i);
    assert.match(step?.statement ?? '', /no crea un pedido/i);
  });

  it('offers convert only when accepted and conversion is allowed', () => {
    const step = quoteNextStep({
      status: 'accepted',
      partyId: 'party-1',
      quoteId: 'quote-1',
      canConvertToOrder: true,
      relatedOrderHref: null,
      relatedOrderLabel: null,
      hasPendingApproval: false,
      canRegisterFollowUp: false,
      followUpHref: null,
    });
    assert.equal(step?.waiting, false);
    assert.match(step?.statement ?? '', /convertirla a pedido/i);
  });

  it('prefers the related pedido when one already exists', () => {
    const step = quoteNextStep({
      status: 'accepted',
      partyId: 'party-1',
      quoteId: 'quote-1',
      canConvertToOrder: true,
      relatedOrderHref: '/clientes/party-1/pedidos/order-1',
      relatedOrderLabel: 'PED-1',
      hasPendingApproval: false,
      canRegisterFollowUp: false,
      followUpHref: null,
    });
    assert.equal(step?.hrefLabel, 'Ver PED-1');
  });

  it('keeps open orders honest about operational follow-through', () => {
    const step = orderNextStep({
      status: 'open',
      partyId: 'party-1',
      orderId: 'order-1',
      customerHref: '/clientes/party-1',
    });
    assert.match(step?.statement ?? '', /registrado/i);
    assert.doesNotMatch(step?.statement ?? '', /fake|demo|invent/i);
  });
});
