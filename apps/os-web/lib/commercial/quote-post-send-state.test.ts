import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { quoteNextStep } from './next-step';
import { isQuotePdfReady } from './quote-pdf-ready';

const nextStepSrc = readFileSync(resolve('lib/commercial/next-step.ts'), 'utf8');
const actions = readFileSync(resolve('lib/commercial/actions.ts'), 'utf8');
const envio = readFileSync(resolve('components/commercial/quote-envio-section.tsx'), 'utf8');
const sendUi = readFileSync(resolve('components/commercial/quote-send-ui.tsx'), 'utf8');
const docActions = readFileSync(resolve('components/commercial/quote-document-actions.tsx'), 'utf8');
const page = readFileSync(
  resolve('app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx'),
  'utf8',
);

const base = {
  partyId: 'party-1',
  quoteId: 'quote-1',
  canConvertToOrder: false,
  relatedOrderHref: null,
  relatedOrderLabel: null,
  hasPendingApproval: false,
  canRegisterFollowUp: true,
  followUpHref: '/clientes/party-1#trabajo',
  lineCount: 2,
} as const;

describe('Task 8 post-send state corrective', () => {
  it('derives next action across draft → presented → sent', () => {
    const draft = quoteNextStep({ ...base, status: 'draft', sendRecorded: false });
    assert.equal(draft?.statement, 'Revise la cotización y preséntela.');
    assert.doesNotMatch(draft?.statement ?? '', /Envío registrado/);

    const presented = quoteNextStep({ ...base, status: 'submitted', sendRecorded: false });
    assert.match(presented?.statement ?? '', /canal habitual/i);
    assert.equal(presented?.hrefLabel, 'Registrar como enviada');
    assert.doesNotMatch(presented?.statement ?? '', /preséntela/);

    const sent = quoteNextStep({ ...base, status: 'submitted', sendRecorded: true });
    assert.match(sent?.statement ?? '', /Envío registrado/);
    assert.doesNotMatch(sent?.statement ?? '', /preséntela|regístrela como enviada/i);
  });

  it('keeps PDF available after present/send and hides active register form after success', () => {
    assert.equal(isQuotePdfReady('submitted'), true);
    assert.equal(isQuotePdfReady('draft'), false);
    assert.match(envio, /allowRegister = canRecordSend && !recorded/);
    assert.match(envio, /data-quote-register-send="active"/);
    assert.match(envio, /\{allowRegister \? \(/);
    assert.match(envio, /markSendRecorded/);
    assert.match(envio, /router\.refresh\(\)/);
    assert.match(docActions, /allowRegister/);
    assert.match(docActions, /data-quote-doc-actions=\{sendRecorded \? 'sent' : 'presented'\}/);
  });

  it('locks in-flight register send and reuses idempotency key', () => {
    assert.match(envio, /CommandSubmitButton/);
    assert.match(envio, /name="idempotencyKey"/);
    assert.match(actions, /RecordQuoteManualSend',\s*payload,\s*idempotencyKey/);
    assert.match(actions, /formData\.get\('idempotencyKey'\)/);
  });

  it('wires live status-aware next action on the quote page', () => {
    assert.match(page, /QuotePageNextStep/);
    assert.match(page, /QuoteSendUiProvider/);
    assert.match(page, /presentedStep/);
    assert.match(page, /sentStep/);
    assert.match(sendUi, /live\?\.quote\.status/);
    assert.match(sendUi, /status === 'draft'/);
    assert.match(sendUi, /sendRecorded && sentStep/);
    assert.doesNotMatch(nextStepSrc, /canRegisterFollowUp && input\.followUpHref && input\.sendRecorded/);
    assert.match(nextStepSrc, /if \(input\.sendRecorded\)/);
  });
});
