import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import type { QuoteDetailReadModel } from '@isalwa/os-contracts';
import type { ContactRecord, PartyRecord } from '@isalwa/os-party';
import { PdfLibPdfProvider } from '@isalwa/providers';
import { buildQuotePdfDocument, pickQuoteContact, QuotePdfService } from './quote-pdf.service';

function quote(overrides: Partial<QuoteDetailReadModel> = {}): QuoteDetailReadModel {
  return {
    quoteId: 'q1',
    organizationId: 'org1',
    partyId: 'p1',
    commercialAccountId: null,
    opportunityId: null,
    ownerMemberId: 'm1',
    quoteNumber: 'Q-000010',
    status: 'draft',
    currency: 'BOB',
    subtotalCentavos: '15000',
    headerDiscountCentavos: '0',
    totalCentavos: '15000',
    revisionNumber: 1,
    notes: null,
    submittedAt: null,
    cancelledAt: null,
    createdAt: '2026-09-13T12:00:00.000Z',
    lines: [
      {
        quoteLineId: 'l1',
        quoteId: 'q1',
        lineNumber: 1,
        description: 'Cemento',
        quantity: 3,
        unitLabel: null,
        unitPriceCentavos: '5000',
        discountCentavos: '0',
        lineTotalCentavos: '15000',
        productRef: null,
      },
    ],
    ...overrides,
  };
}

describe('quote PDF document builder', () => {
  it('builds totals and draft label from governed quote', () => {
    const party: PartyRecord = {
      id: 'p1',
      organizationId: 'org1',
      partyKind: 'organization',
      displayName: 'Ferretería Central',
      legalName: null,
      status: 'active',
      mergedIntoPartyId: null,
      version: 0,
    };
    const doc = buildQuotePdfDocument({
      quote: quote(),
      party,
      contacts: [],
      organizationLegalName: 'ISALWA Operaciones',
    });
    assert.equal(doc.documentTitle, 'COTIZACIÓN');
    assert.equal(doc.customerName, 'Ferretería Central');
    assert.equal(doc.totalLabel, 'Bs. 150,00');
    assert.equal(doc.draftLabel, 'Borrador');
    assert.equal(doc.contactName, null);
  });

  it('omits contact when none exist and uses submitted date when present', () => {
    const doc = buildQuotePdfDocument({
      quote: quote({
        status: 'submitted',
        submittedAt: '2026-09-14T12:00:00.000Z',
        notes: '  Condiciones normales  ',
        lines: [],
        subtotalCentavos: '0',
        totalCentavos: '0',
      }),
      party: null,
      contacts: [],
      organizationLegalName: null,
    });
    assert.equal(doc.customerName, 'Cliente');
    assert.equal(doc.draftLabel, null);
    assert.equal(doc.notes, 'Condiciones normales');
    assert.equal(doc.lines.length, 0);
    assert.equal(doc.contactPhone, null);
  });

  it('picks active contact phone/email without inventing values', () => {
    const contacts: ContactRecord[] = [
      {
        id: 'c1',
        organizationId: 'org1',
        organizationPartyId: 'p1',
        personPartyId: null,
        givenName: 'Ana',
        familyName: 'Ruiz',
        email: 'ana@example.bo',
        phone: null,
        whatsapp: '+59171111111',
        title: null,
        status: 'active',
        version: 0,
      },
    ];
    const picked = pickQuoteContact(contacts);
    assert.equal(picked.contactName, 'Ana Ruiz');
    assert.equal(picked.contactPhone, '+59171111111');
    assert.equal(picked.contactEmail, 'ana@example.bo');
  });
});

describe('QuotePdfService render', () => {
  it('returns application/pdf bytes with safe filename', async () => {
    const service = new QuotePdfService(
      {
        getPartyInOrg: async () => null,
        listContactsForOrgParty: async () => ({ items: [], hasMore: false, nextCursor: null }),
      } as never,
      new PdfLibPdfProvider(),
    );
    const rendered = await service.renderAuthorizedQuote(quote({ status: 'submitted' }));
    assert.equal(rendered.contentType, 'application/pdf');
    assert.equal(rendered.filename, 'Cotizacion-Q-000010.pdf');
    assert.equal(
      String.fromCharCode(
        rendered.bytes[0]!,
        rendered.bytes[1]!,
        rendered.bytes[2]!,
        rendered.bytes[3]!,
      ),
      '%PDF',
    );
    const loaded = await PDFDocument.load(rendered.bytes);
    assert.equal(loaded.getPageCount(), 1);
  });
});
