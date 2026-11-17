import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import type { QuoteDetailReadModel } from '@isalwa/os-contracts';
import { quoteIssuedDocumentHash, type QuoteLineRecord, type QuoteRecord } from '@isalwa/os-commercial';
import type { ContactRecord, PartyRecord } from '@isalwa/os-party';
import { PdfLibPdfProvider } from '@isalwa/providers';
import {
  buildQuotePdfDocument,
  overlayIssuedQuoteTerms,
  pickQuoteContact,
  QuotePdfService,
} from './quote-pdf.service';

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

  it('never prints a former or inactive contact (T03 L1)', () => {
    const base: ContactRecord = {
      id: 'c1',
      organizationId: 'org1',
      organizationPartyId: 'p1',
      personPartyId: null,
      givenName: 'Ana',
      familyName: 'Ruiz',
      email: 'ana@example.bo',
      phone: '+59171111111',
      whatsapp: null,
      title: null,
      status: 'inactive',
      version: 1,
      relationEndedAt: new Date('2026-10-01T04:00:00.000Z'),
      relationEndReason: 'left_company',
    };
    assert.deepEqual(pickQuoteContact([base]), { contactName: null, contactPhone: null, contactEmail: null });
    assert.deepEqual(pickQuoteContact([{ ...base, relationEndedAt: null }]), { contactName: null, contactPhone: null, contactEmail: null });
    const current = { ...base, id: 'c2', givenName: 'Luis', familyName: 'Paz', email: null, status: 'active', relationEndedAt: null };
    assert.equal(pickQuoteContact([base, current]).contactName, 'Luis Paz');
  });
});

function issuedRecord(overrides: Partial<QuoteRecord> = {}): QuoteRecord {
  return {
    id: 'q1',
    organizationId: 'org1',
    partyId: 'p1',
    commercialAccountId: null,
    opportunityId: null,
    ownerMemberId: 'm1',
    quoteNumber: 'Q-000010',
    status: 'submitted',
    currency: 'BOB',
    subtotalCentavos: 15000n,
    headerDiscountCentavos: 0n,
    totalCentavos: 15000n,
    revisionNumber: 1,
    notes: null,
    version: 2,
    submittedAt: new Date('2026-09-14T12:00:00.000Z'),
    issuedAt: new Date('2026-09-14T12:00:00.000Z'),
    issuedDocumentHash: null,
    issuedRevisionNumber: 1,
    validUntil: new Date('2026-12-01T00:00:00.000Z'),
    customerAcceptedAt: null,
    customerAcceptanceChannel: null,
    customerAcceptanceEvidence: null,
    customerAcceptedRevision: null,
    cancelledAt: null,
    createdAt: new Date('2026-09-13T12:00:00.000Z'),
    updatedAt: new Date('2026-09-14T12:00:00.000Z'),
    ...overrides,
  };
}

function issuedLines(): QuoteLineRecord[] {
  return [
    {
      id: 'l1',
      organizationId: 'org1',
      quoteId: 'q1',
      lineNumber: 1,
      description: 'Cemento',
      quantity: 3,
      unitLabel: 'bolsa',
      unitPriceCentavos: 5000n,
      discountCentavos: 0n,
      lineTotalCentavos: 15000n,
      productRef: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

describe('QuotePdfService render', () => {
  const partyStore = {
    getPartyInOrg: async () => null,
    listContactsForOrgParty: async () => ({ items: [], hasMore: false, nextCursor: null }),
  } as never;

  it('returns application/pdf bytes with safe filename for drafts', async () => {
    const service = new QuotePdfService(partyStore, new PdfLibPdfProvider(), null);
    const rendered = await service.renderAuthorizedQuote(quote({ status: 'draft' }));
    assert.equal(rendered.contentType, 'application/pdf');
    assert.equal(rendered.filename, 'Cotizacion-Q-000010.pdf');
    assert.equal(rendered.issuedDocumentVerified, false);
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

  it('pins issued PDF download to the frozen document hash', async () => {
    const lines = issuedLines();
    const record = issuedRecord();
    const hash = quoteIssuedDocumentHash({
      quoteNumber: record.quoteNumber,
      revisionNumber: record.revisionNumber,
      partyId: record.partyId,
      currency: record.currency,
      notes: record.notes,
      validUntil: record.validUntil,
      headerDiscountCentavos: record.headerDiscountCentavos,
      lines,
    });
    record.issuedDocumentHash = hash;

    const service = new QuotePdfService(partyStore, new PdfLibPdfProvider(), {
      getQuoteInOrg: async () => record,
      listQuoteLines: async () => lines,
    } as never);

    const rendered = await service.renderAuthorizedQuote(
      quote({
        status: 'submitted',
        submittedAt: '2026-09-14T12:00:00.000Z',
        issuedAt: '2026-09-14T12:00:00.000Z',
        issuedDocumentHash: hash,
        issuedRevisionNumber: 1,
      }),
    );
    assert.equal(rendered.issuedDocumentVerified, true);
    assert.ok(rendered.bytes.byteLength > 500);

    const drifted = { ...record, notes: 'tampered' };
    const refusing = new QuotePdfService(partyStore, new PdfLibPdfProvider(), {
      getQuoteInOrg: async () => drifted,
      listQuoteLines: async () => lines,
    } as never);
    await assert.rejects(
      () =>
        refusing.renderAuthorizedQuote(
          quote({
            status: 'submitted',
            issuedAt: '2026-09-14T12:00:00.000Z',
            issuedDocumentHash: hash,
            issuedRevisionNumber: 1,
          }),
        ),
      /ISSUED_DOCUMENT_MISMATCH/,
    );
  });

  it('includes units, validity and discounts on the printable document', () => {
    const lines = issuedLines();
    lines[0]!.discountCentavos = 500n;
    lines[0]!.lineTotalCentavos = 14500n;
    const record = issuedRecord({ headerDiscountCentavos: 1000n, totalCentavos: 13500n });
    const detail = overlayIssuedQuoteTerms(quote({ status: 'submitted' }), record, lines);
    const doc = buildQuotePdfDocument({
      quote: detail,
      party: null,
      contacts: [],
      organizationLegalName: null,
    });
    assert.equal(doc.lines[0]?.unitLabel, 'bolsa');
    assert.equal(doc.lines[0]?.discountLabel, 'Bs. 5,00');
    assert.equal(doc.headerDiscountLabel, 'Bs. 10,00');
    assert.match(doc.validUntilLabel ?? '', /\d{2}\/\d{2}\/\d{4}/);
    assert.equal(doc.issuedRevisionLabel, 'Revisión 1');
  });
});
