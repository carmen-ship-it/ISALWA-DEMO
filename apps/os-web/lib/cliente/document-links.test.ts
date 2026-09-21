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
      meta: { nextCursor: null, limit: 50, hasMore: false },
      freshness: null,
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
          meta: { nextCursor: null, limit: 50, hasMore: false },
          freshness: null,
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
      } as unknown as Partial<OsApiClient>),
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

  it('caps merged links at 25 and reports truthful partial without fake totals', async () => {
    const quotes = Array.from({ length: 10 }, (_, i) => ({
      quoteId: `q-${i + 1}`,
      quoteNumber: `Q-${String(i + 1).padStart(6, '0')}`,
      partyId: MADERAS_PARTY,
      opportunityId: i < 12 ? `opp-${i + 1}` : null,
      status: 'submitted' as const,
      createdAt: `2026-09-17T00:00:${String(i).padStart(2, '0')}.000Z`,
      submittedAt: `2026-09-17T00:01:${String(i).padStart(2, '0')}.000Z`,
      ownerMemberId: 'member-1',
      currency: 'BOB',
      totalCentavos: 100,
    }));
    let opportunityFetches = 0;
    const outcome = await loadDocumentLinks(
      mockClient({
        listQuotes: async (query?: { limit?: number }) => {
          assert.equal(query?.limit, 10);
          return {
            items: quotes,
            nextCursor: null,
            meta: { nextCursor: 'more', limit: 10, hasMore: true },
            freshness: null,
          };
        },
        getOpportunity: async () => {
          opportunityFetches += 1;
          return {
            opportunity: {
              opportunityId: 'opp',
              title: 'Título',
              partyId: MADERAS_PARTY,
              stage: 'propuesta',
              ownerMemberId: 'member-1',
              createdAt: '2026-09-17T00:00:00.000Z',
            },
          };
        },
        listOrders: async (query?: { limit?: number }) => {
          assert.equal(query?.limit, 10);
          return {
            items: Array.from({ length: 10 }, (_, i) => ({
              orderId: `o-${i + 1}`,
              orderNumber: `O-${i + 1}`,
              partyId: MADERAS_PARTY,
              quoteId: `q-${i + 1}`,
              status: 'open',
              createdAt: `2026-09-17T01:00:${String(i).padStart(2, '0')}.000Z`,
              ownerMemberId: 'member-1',
            })),
            nextCursor: null,
            meta: { nextCursor: null, limit: 10, hasMore: false },
            freshness: null,
          };
        },
        get: async (_path: string, query?: { orderId?: string; limit?: number }) => {
          assert.equal(query?.limit, 25);
          const orderId = String(query?.orderId ?? 'o-1');
          const n = Number(orderId.replace('o-', '')) || 1;
          return {
            notes: [
              {
                id: `dn-${orderId}-a`,
                internalDocumentRef: `NE-${n}-A`,
                status: 'issued',
                bornAt: `2026-09-17T02:00:${String(n).padStart(2, '0')}.000Z`,
              },
              {
                id: `dn-${orderId}-b`,
                internalDocumentRef: `NE-${n}-B`,
                status: 'issued',
                bornAt: `2026-09-17T02:10:${String(n).padStart(2, '0')}.000Z`,
              },
            ],
          };
        },
      } as unknown as Partial<OsApiClient>),
      MADERAS_PARTY,
    );
    assert.equal(outcome.status, 'ok');
    if (outcome.status !== 'ok') return;
    assert.equal(outcome.links.length, 25);
    assert.equal(outcome.partial, true);
    assert.equal(outcome.hasMore, true);
    assert.equal('total' in outcome, false);
    assert.ok(opportunityFetches <= 10);
    assert.equal(opportunityFetches, 10);
  });

  it('does not claim an exact found count from capped assembly in the UI', () => {
    const ui = readFileSync(
      join(process.cwd(), 'components/cliente/cliente-360-documentos.tsx'),
      'utf8',
    );
    assert.match(ui, /DOCUMENTOS_COPY\.partial/);
    assert.doesNotMatch(ui, /encontrados/);
    assert.doesNotMatch(ui, /de \{outcome\.links\.length\}/);
  });
});
