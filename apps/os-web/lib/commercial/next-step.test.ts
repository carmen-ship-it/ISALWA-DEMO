import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  APPROVAL_ATTENTION_RESOLVED_COPY,
  COMMERCIAL_NEXT_STEP_LABEL,
  latestQuoteApprovalDecision,
  opportunityNextStep,
  orderNextStep,
  preferredLinkedQuote,
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
    assert.equal(step?.hrefLabel, 'Crear cotización');
    assert.equal(step?.href, '/clientes/party-1/oportunidades/opp-1/cotizaciones/nueva');
    assert.equal(step?.waiting, false);
    assert.match(step?.statement ?? '', /cotización/i);
  });

  it('points an open opportunity at the linked quote when that href is already known', () => {
    const step = opportunityNextStep({
      status: 'open',
      partyId: 'party-1',
      opportunityId: 'opp-1',
      newQuoteHref: '/clientes/party-1/oportunidades/opp-1/cotizaciones/nueva',
      linkedQuoteHref: '/clientes/party-1/cotizaciones/quote-8',
    });
    assert.equal(step?.hrefLabel, 'Ver cotización');
    assert.equal(step?.href, '/clientes/party-1/cotizaciones/quote-8');
    assert.equal(step?.waiting, false);
  });

  it('keeps Crear cotización when the linked quote href is blank', () => {
    const step = opportunityNextStep({
      status: 'open',
      partyId: 'party-1',
      opportunityId: 'opp-1',
      newQuoteHref: '/nueva',
      linkedQuoteHref: '   ',
    });
    assert.equal(step?.hrefLabel, 'Crear cotización');
    assert.equal(step?.href, '/nueva');
  });

  it('prefers an accepted linked quote already loaded for the opportunity', () => {
    const picked = preferredLinkedQuote(
      [
        {
          quoteId: 'draft-1',
          partyId: 'party-1',
          opportunityId: 'opp-1',
          status: 'draft',
        },
        {
          quoteId: 'quote-8',
          partyId: 'party-1',
          opportunityId: 'opp-1',
          status: 'accepted',
        },
        {
          quoteId: 'other',
          partyId: 'party-2',
          opportunityId: 'opp-2',
          status: 'submitted',
        },
      ],
      'opp-1',
    );
    assert.equal(picked?.quoteId, 'quote-8');
    assert.equal(preferredLinkedQuote([], 'opp-1'), null);
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

  it('surfaces evidenced pending approver on the quote next step with Ver solicitud', () => {
    const step = quoteNextStep({
      status: 'submitted',
      partyId: 'party-1',
      quoteId: 'quote-1',
      canConvertToOrder: false,
      relatedOrderHref: null,
      relatedOrderLabel: null,
      hasPendingApproval: true,
      canRegisterFollowUp: false,
      followUpHref: null,
      pendingApprovalHeadline: 'Pendiente de aprobación de Ana López · Comercial',
      pendingApprovalHref: '/aprobaciones/apr-1',
    });
    assert.equal(step?.waiting, true);
    assert.equal(step?.statement, 'Pendiente de aprobación de Ana López · Comercial');
    assert.equal(step?.href, '/aprobaciones/apr-1');
    assert.equal(step?.hrefLabel, 'Ver solicitud');
  });

  it('asks for manual send on submitted without treating submit as external send', () => {
    const step = quoteNextStep({
      status: 'submitted',
      partyId: 'party-1',
      quoteId: 'quote-1',
      canConvertToOrder: true,
      relatedOrderHref: null,
      relatedOrderLabel: null,
      hasPendingApproval: false,
      canRegisterFollowUp: true,
      followUpHref: '/clientes/party-1#trabajo',
    });
    assert.equal(step?.waiting, false);
    assert.match(step?.statement ?? '', /presentada/i);
    assert.match(step?.statement ?? '', /envío manual/i);
    assert.doesNotMatch(step?.statement ?? '', /creó un pedido/i);
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

  it('surfaces post-approval next step without inventing convert or assignees', () => {
    const step = quoteNextStep({
      status: 'submitted',
      partyId: 'party-1',
      quoteId: 'quote-1',
      canConvertToOrder: true,
      relatedOrderHref: null,
      relatedOrderLabel: null,
      hasPendingApproval: false,
      canRegisterFollowUp: true,
      followUpHref: '/clientes/party-1#trabajo',
      latestApprovalDecision: 'approved',
    });
    assert.equal(step?.waiting, false);
    assert.match(step?.statement ?? '', /aprobación registrada/i);
    assert.match(step?.statement ?? '', /no crea un pedido/i);
    assert.ok((step?.statement ?? '').includes(APPROVAL_ATTENTION_RESOLVED_COPY));
    assert.equal(step?.hrefLabel, 'Registrar seguimiento');
    assert.doesNotMatch(step?.statement ?? '', /convertir|assignee|SLA/i);
  });

  it('explains rejection after decision without creating a pedido', () => {
    const step = quoteNextStep({
      status: 'submitted',
      partyId: 'party-1',
      quoteId: 'quote-1',
      canConvertToOrder: true,
      relatedOrderHref: null,
      relatedOrderLabel: null,
      hasPendingApproval: false,
      canRegisterFollowUp: false,
      followUpHref: null,
      latestApprovalDecision: 'rejected',
    });
    assert.equal(step?.waiting, true);
    assert.match(step?.statement ?? '', /rechazada/i);
    assert.match(step?.statement ?? '', /no se creó un pedido/i);
    assert.equal(step?.hrefLabel, 'Ver cliente');
  });

  it('picks the latest recorded approval decision without inventing pending ones', () => {
    assert.equal(
      latestQuoteApprovalDecision([
        { status: 'pending', decidedAt: null },
        { status: 'approved', decidedAt: '2026-09-01T10:00:00.000Z' },
        { status: 'rejected', decidedAt: '2026-09-02T10:00:00.000Z' },
      ]),
      'rejected',
    );
    assert.equal(latestQuoteApprovalDecision([{ status: 'pending' }]), null);
  });

});
