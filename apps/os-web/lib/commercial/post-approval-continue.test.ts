import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  POST_APPROVAL_CANCELLED_EXPLANATION,
  POST_APPROVAL_CONVERT_LABEL,
  POST_APPROVAL_QUOTE_LINK_LABEL,
  postApprovalContinue,
  quoteConvertHref,
} from './post-approval-continue';

describe('postApprovalContinue', () => {
  it('hides continue cues while approval is pending', () => {
    const result = postApprovalContinue({
      approvalStatus: 'pending',
      subjectType: 'quote',
      quoteStatus: 'submitted',
      canConvertToOrder: true,
      partyId: 'party-1',
      quoteId: 'quote-1',
    });
    assert.equal(result.showContinue, false);
    assert.equal(result.convertHref, null);
    assert.equal(result.quoteHref, null);
  });

  it('offers Ver cotización and Convertir when authority allows convert', () => {
    const result = postApprovalContinue({
      approvalStatus: 'approved',
      subjectType: 'quote',
      quoteStatus: 'submitted',
      canConvertToOrder: true,
      partyId: 'party-1',
      quoteId: 'quote-1',
    });
    assert.equal(result.showContinue, true);
    assert.equal(result.decisionLabel, 'Aprobado');
    assert.equal(result.quoteLinkLabel, POST_APPROVAL_QUOTE_LINK_LABEL);
    assert.equal(result.quoteHref, '/clientes/party-1/cotizaciones/quote-1');
    assert.equal(result.convertLabel, POST_APPROVAL_CONVERT_LABEL);
    assert.equal(result.convertHref, '/clientes/party-1/cotizaciones/quote-1#convertir-pedido');
    assert.equal(result.stateExplanation, null);
  });

  it('explains cancelled quotes and withholds Convertir', () => {
    const result = postApprovalContinue({
      approvalStatus: 'approved',
      subjectType: 'quote',
      quoteStatus: 'cancelled',
      canConvertToOrder: false,
      partyId: 'party-1',
      quoteId: 'quote-1',
    });
    assert.equal(result.convertHref, null);
    assert.equal(result.quoteHref, '/clientes/party-1/cotizaciones/quote-1');
    assert.equal(result.stateExplanation, POST_APPROVAL_CANCELLED_EXPLANATION);
  });

  it('withholds Convertir when submitted but actor lacks convert scope', () => {
    const result = postApprovalContinue({
      approvalStatus: 'approved',
      subjectType: 'quote',
      quoteStatus: 'submitted',
      canConvertToOrder: false,
      partyId: 'party-1',
      quoteId: 'quote-1',
    });
    assert.equal(result.convertHref, null);
    assert.match(result.stateExplanation ?? '', /Enviada/);
    assert.match(result.stateExplanation ?? '', /no crea un pedido/i);
  });

  it('never treats approval of an order subject as convert', () => {
    const result = postApprovalContinue({
      approvalStatus: 'approved',
      subjectType: 'order',
      quoteStatus: null,
      canConvertToOrder: true,
      partyId: 'party-1',
      quoteId: null,
    });
    assert.equal(result.showContinue, true);
    assert.equal(result.convertHref, null);
    assert.equal(result.quoteHref, null);
  });

  it('builds convert deep link with evidenced hash', () => {
    assert.equal(
      quoteConvertHref('p', 'q'),
      '/clientes/p/cotizaciones/q#convertir-pedido',
    );
  });
});

describe('decideCommercialApprovalAction redirect (structural)', () => {
  it('prefers quoteHref redirectTo and never CreateOrder', () => {
    const root = resolve(import.meta.dirname, '../..');
    const actions = readFileSync(resolve(root, 'lib/commercial/actions.ts'), 'utf8');
    const decideSlice = actions.slice(
      actions.indexOf('export async function decideCommercialApprovalAction'),
      actions.indexOf('export async function reassignCommercialAccountOwnerAction'),
    );
    assert.match(decideSlice, /redirectTo:\s*quoteHref\(partyId,\s*subjectId\)/);
    assert.doesNotMatch(decideSlice, /CreateOrder|insertOrder|order\.created/);
  });

  it('approval decision form honors redirectTo when present', () => {
    const root = resolve(import.meta.dirname, '../..');
    const panel = readFileSync(
      resolve(root, 'components/commercial/commercial-approval-panel.tsx'),
      'utf8',
    );
    assert.match(panel, /result\.redirectTo/);
    assert.match(panel, /router\.push\(result\.redirectTo\)/);
  });
});
