import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  composeDocumentDossier,
  deliveryNotePdfHref,
  quotePdfHref,
} from '@/lib/commercial/document-dossier';
import { sampleCommercialTimelineEntry, sampleQuote } from '@/lib/commercial/fixtures';
import type { PartyTimelineEntryReadModel } from '@isalwa/os-contracts';

const sendEvidence: PartyTimelineEntryReadModel = {
  ...sampleCommercialTimelineEntry,
  entryId: 'tl-send',
  eventType: 'quote.send_recorded',
  facts: {
    quoteId: sampleQuote.quoteId,
    quoteNumber: sampleQuote.quoteNumber,
    partyId: sampleQuote.partyId,
    channel: 'whatsapp',
    note: 'Enviado al comprador',
    providerSend: false,
  },
};

describe('document dossier composition', () => {
  it('links Quote PDF and Nota PDF via existing routes without inventing storage', () => {
    const items = composeDocumentDossier({
      partyId: 'party-1',
      quotes: [sampleQuote],
      deliveryNotes: [
        {
          id: 'note-1',
          internalDocumentRef: 'NE-PILOT-note-1',
          bornAt: '2026-08-23T10:00:00.000Z',
          status: 'issued',
        },
      ],
      timelineEntries: [sendEvidence],
    });

    const quotePdf = items.find((i) => i.kind === 'quote_pdf');
    const notaPdf = items.find((i) => i.kind === 'nota_pdf');
    const send = items.find((i) => i.kind === 'send_evidence');

    assert.equal(quotePdf?.href, quotePdfHref(sampleQuote.quoteId));
    assert.equal(notaPdf?.href, deliveryNotePdfHref('note-1'));
    assert.equal(send?.href, `/clientes/party-1/cotizaciones/${sampleQuote.quoteId}`);
    assert.match(send?.label ?? '', /WhatsApp/);
    assert.equal(quotePdfHref('q/../evil'), '/api/quotes/q%2F..%2Fevil/pdf');
  });

  it('filters to the pedido source quote when requested', () => {
    const other = { ...sampleQuote, quoteId: 'quote-2', quoteNumber: 'Q-000002' };
    const items = composeDocumentDossier({
      partyId: 'party-1',
      quotes: [sampleQuote, other],
      quoteIdFilter: sampleQuote.quoteId,
      timelineEntries: [
        sendEvidence,
        {
          ...sendEvidence,
          entryId: 'tl-send-2',
          facts: { ...sendEvidence.facts, quoteId: 'quote-2', quoteNumber: 'Q-000002' },
        },
      ],
    });
    assert.equal(items.filter((i) => i.kind === 'quote_pdf').length, 1);
    assert.equal(items.filter((i) => i.kind === 'send_evidence').length, 1);
    assert.equal(items[0]?.kind === 'send_evidence' || items.some((i) => i.id.includes(sampleQuote.quoteId)), true);
  });

  it('skips reversed notas and send rows without durable quoteId', () => {
    const items = composeDocumentDossier({
      partyId: 'party-1',
      deliveryNotes: [
        {
          id: 'note-rev',
          internalDocumentRef: 'NE-X',
          bornAt: '2026-08-23T10:00:00.000Z',
          status: 'reversed',
        },
      ],
      timelineEntries: [
        {
          ...sendEvidence,
          entryId: 'orphan',
          facts: { channel: 'whatsapp', partyId: 'party-1' },
        },
      ],
    });
    assert.equal(items.length, 0);
  });
});
