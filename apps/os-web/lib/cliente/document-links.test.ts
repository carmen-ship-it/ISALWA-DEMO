/**
 * PF-4 — Cliente360 Documentos uses the normal-product PDF route family.
 * No demo-only static PDFs; Quote + DN hrefs share /api/quotes|delivery-notes/.../pdf.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OsApiClient } from '@/lib/api/os-api-client';
import { loadDocumentLinks } from './document-links';

const MADERAS_PARTY = '01M2PM95PV7YP6AECYXSX4GRBW';
const MADERAS_QUOTE = '01M2PM9KSJXN1K4CF45FT0H299';
const MADERAS_ORDER = '01M2PMA280KX4AAV7049YKNE07';
const MADERAS_DN = '01M2PMCSNXH644P1C4F832BGKQ';

function mockClient(overrides: Partial<OsApiClient> = {}): OsApiClient {
  return {
    listPartyTimeline: async () => ({
      items: [
        {
          entryId: 'tl-1',
          eventType: 'quote.send_recorded',
          occurredAt: '2026-09-17T00:00:00.000Z',
          facts: { quoteId: MADERAS_QUOTE },
        },
      ],
      nextCursor: null,
    }),
    listQuotes: async () => ({
      items: [
        {
          quoteId: MADERAS_QUOTE,
          quoteNumber: 'Q-000002',
          partyId: MADERAS_PARTY,
          opportunityId: '01M2PM9GD3P8CNE3HPS5QBCYW8',
          status: 'accepted',
          createdAt: '2026-09-17T00:00:00.000Z',
          submittedAt: '2026-09-17T00:01:00.000Z',
          ownerMemberId: 'member-1',
          currency: 'BOB',
          totalCentavos: 450000,
        },
      ],
      nextCursor: null,
    }),
    getOpportunity: async () => ({
      opportunity: {
        opportunityId: '01M2PM9GD3P8CNE3HPS5QBCYW8',
        title: 'DEMO MADERAS — loop sano',
        partyId: MADERAS_PARTY,
        stage: 'propuesta',
        ownerMemberId: 'member-1',
        createdAt: '2026-09-17T00:00:00.000Z',
      },
    }),
    listOrders: async () => ({
      items: [
        {
          orderId: MADERAS_ORDER,
          orderNumber: 'O-000002',
          partyId: MADERAS_PARTY,
          quoteId: MADERAS_QUOTE,
          status: 'open',
          createdAt: '2026-09-17T00:02:00.000Z',
          ownerMemberId: 'member-1',
        },
      ],
      nextCursor: null,
    }),
    get: async () => ({
      notes: [
        {
          id: MADERAS_DN,
          internalDocumentRef: 'NE-DEMO-MADERAS',
          status: 'issued',
          bornAt: '2026-09-17T00:03:00.000Z',
        },
      ],
    }),
    ...overrides,
  } as unknown as OsApiClient;
}

describe('PF-4 document links — normal product PDF routes', () => {
  it('surfaces Quote PDF + Delivery Note PDF via shared /api/.../pdf routes', async () => {
    const outcome = await loadDocumentLinks(mockClient(), MADERAS_PARTY);
    assert.equal(outcome.status, 'ok');
    if (outcome.status !== 'ok') return;

    const quote = outcome.links.find((l) => l.type === 'quote_pdf');
    const dn = outcome.links.find((l) => l.type === 'delivery_note_pdf');
    assert.ok(quote);
    assert.ok(dn);
    assert.equal(quote.href, `/api/quotes/${MADERAS_QUOTE}/pdf`);
    assert.equal(quote.viewHref, `/api/quotes/${MADERAS_QUOTE}/pdf?disposition=inline`);
    assert.equal(dn.href, `/api/delivery-notes/${MADERAS_DN}/pdf`);
    assert.equal(dn.viewHref, `/api/delivery-notes/${MADERAS_DN}/pdf`);
    assert.equal(quote.reference, 'Q-000002');
    assert.equal(dn.reference, 'NE-DEMO-MADERAS');
  });

  it('skips draft quotes and reversed delivery notes', async () => {
    const outcome = await loadDocumentLinks(
      mockClient({
        listQuotes: async () => ({
          items: [
            {
              quoteId: 'draft-1',
              quoteNumber: 'Q-DRAFT',
              partyId: MADERAS_PARTY,
              opportunityId: null,
              status: 'draft',
              createdAt: '2026-09-17T00:00:00.000Z',
              submittedAt: null,
              ownerMemberId: 'member-1',
              currency: 'BOB',
              totalCentavos: 0,
            },
          ],
          nextCursor: null,
        }),
        get: async () => ({
          notes: [
            {
              id: 'rev-1',
              internalDocumentRef: 'NE-REV',
              status: 'reversed',
              bornAt: '2026-09-17T00:03:00.000Z',
            },
          ],
        }),
      } as Partial<OsApiClient>),
      MADERAS_PARTY,
    );
    assert.equal(outcome.status, 'ok');
    if (outcome.status !== 'ok') return;
    assert.equal(outcome.links.length, 0);
  });

  it('Cliente360 Documentos UI binds Ver/Descargar to document link hrefs', () => {
    const ui = readFileSync(
      join(process.cwd(), 'components/cliente/cliente-360-documentos.tsx'),
      'utf8',
    );
    assert.match(ui, /doc\.viewHref/);
    assert.match(ui, /doc\.href/);
    assert.match(ui, /DOCUMENTOS_COPY\.viewPdf/);
    assert.match(ui, /DOCUMENTOS_COPY\.download/);
    assert.doesNotMatch(ui, /\/demo\/.*\.pdf|static.*pdf|public\/.*\.pdf/);
  });
});
