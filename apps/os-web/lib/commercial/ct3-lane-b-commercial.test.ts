import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { commercialProgressSteps } from '@/lib/commercial/commercial-progress';
import {
  isQuotePdfReady,
  quotePdfDownloadFilename,
} from '@/lib/commercial/quote-pdf-ready';
import { findLatestQuoteSendRecord, quoteSendStatusLabel } from '@/lib/commercial/quote-send-status';
import { QUOTE_MANUAL_SEND_COPY } from '@/lib/commercial/quote-manual-send';

describe('CT3-B commercial completeness helpers', () => {
  it('marks commercial progress without opaque IDs', () => {
    const open = commercialProgressSteps({ hasQuote: false });
    assert.equal(open[0]?.state, 'complete');
    assert.equal(open[1]?.state, 'current');
    assert.equal(open[2]?.state, 'upcoming');
    assert.deepEqual(
      open.map((step) => step.label),
      ['Cliente', 'Oportunidad', 'Cotización'],
    );

    const withQuote = commercialProgressSteps({ hasQuote: true, onQuote: false });
    assert.equal(withQuote[1]?.state, 'complete');
    assert.equal(withQuote[2]?.state, 'complete');

    const onQuote = commercialProgressSteps({ hasQuote: true, onQuote: true });
    assert.equal(onQuote[2]?.state, 'current');
  });

  it('treats draft quotes as PDF not-ready and uses human filenames', () => {
    assert.equal(isQuotePdfReady('draft'), false);
    assert.equal(isQuotePdfReady('submitted'), true);
    assert.equal(quotePdfDownloadFilename('Q-000123'), 'Cotizacion-Q-000123.pdf');
  });

  it('resolves envío status from durable send_recorded facts', () => {
    assert.equal(quoteSendStatusLabel(null), QUOTE_MANUAL_SEND_COPY.statusUnregistered);
    const latest = findLatestQuoteSendRecord(
      [
        {
          entryId: '1',
          organizationId: 'org',
          partyId: 'party',
          eventType: 'quote.send_recorded',
          occurredAt: '2026-09-10T12:00:00.000Z',
          actorMemberId: 'm1',
          correlationId: 'c1',
          primaryEntityType: 'quote',
          primaryEntityId: 'q1',
          facts: { quoteId: 'q1', channel: 'whatsapp' },
        },
        {
          entryId: '2',
          organizationId: 'org',
          partyId: 'party',
          eventType: 'quote.send_recorded',
          occurredAt: '2026-09-12T12:00:00.000Z',
          actorMemberId: 'm2',
          correlationId: 'c2',
          primaryEntityType: 'quote',
          primaryEntityId: 'q1',
          facts: { quoteId: 'q1', channel: 'email' },
        },
      ],
      'q1',
    );
    assert.equal(latest?.channel, 'email');
    assert.equal(quoteSendStatusLabel(latest), QUOTE_MANUAL_SEND_COPY.statusEmail);
  });

  it('wires opportunity Crear/Ver CTA and quote document/envío surfaces', () => {
    const opportunity = readFileSync(
      resolve('app/(app)/clientes/[partyId]/oportunidades/[opportunityId]/page.tsx'),
      'utf8',
    );
    const quote = readFileSync(
      resolve('app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx'),
      'utf8',
    );
    const documentos = readFileSync(
      resolve('components/cliente/cliente-360-documentos.tsx'),
      'utf8',
    );
    assert.match(opportunity, /RecordNextStep/);
    assert.match(opportunity, /opportunityNextStep/);
    assert.match(opportunity, /newQuoteHref\(partyId, opportunityId\)/);
    assert.match(opportunity, /CommercialProgressStrip/);
    assert.match(opportunity, /Qué necesita/);
    const nextStep = readFileSync(resolve('lib/commercial/next-step.ts'), 'utf8');
    assert.match(nextStep, /hrefLabel: 'Crear cotización'/);
    assert.match(nextStep, /hrefLabel: 'Ver cotización'/);
    assert.match(quote, /QuoteDocumentoCard/);
    assert.match(quote, /QuoteEnvioSection/);
    assert.match(quote, /QuoteDetailActions/);
    assert.match(documentos, /DOCUMENTOS_COPY\.viewPdf/);
    assert.match(documentos, /DOCUMENTOS_COPY\.download/);
    assert.match(documentos, /data-cliente360-documentos="table"/);
    assert.match(documentos, /data-cliente360-documentos-layout="scan"/);
    assert.doesNotMatch(documentos, /<table/);
  });

  it('fresh opportunity without linked quote keeps Crear cotización (RC4 opp→quote)', () => {
    const opportunity = readFileSync(
      resolve('app/(app)/clientes/[partyId]/oportunidades/[opportunityId]/page.tsx'),
      'utf8',
    );
    // Must not treat party-level quotes as linked unless opportunityId matches.
    assert.match(opportunity, /preferred\.opportunityId === opportunityId/);
    assert.match(opportunity, /isOpen && linkedQuote/);
    assert.match(opportunity, /Crear otra cotización/);
    assert.match(opportunity, /RecordNextStep/);
    assert.match(opportunity, /newQuoteHref\(partyId, opportunityId\)/);
    const nextStepSrc = readFileSync(resolve('lib/commercial/next-step.ts'), 'utf8');
    assert.match(nextStepSrc, /hrefLabel: 'Crear cotización'/);
  });
});
