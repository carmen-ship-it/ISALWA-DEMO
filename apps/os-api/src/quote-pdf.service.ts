import {
  createPdfProvider,
  formatBobCentavos,
  formatQuotePdfDate,
  sanitizeQuotePdfFilename,
  type PdfProvider,
  type QuotePdfDocument,
} from '@isalwa/providers';
import { pickCurrentContact, type QuoteDetailReadModel } from '@isalwa/os-contracts';
import {
  assertIssuedDocumentHashMatches,
  type OsCommercialStore,
  type QuoteLineRecord,
  type QuoteRecord,
} from '@isalwa/os-commercial';
import type { ContactRecord, OsPartyStore, PartyRecord } from '@isalwa/os-party';
import { getOsPrisma } from '@isalwa/os-database';

export type QuotePdfBuildInput = {
  quote: QuoteDetailReadModel;
  party: PartyRecord | null;
  contacts: ContactRecord[];
  organizationLegalName: string | null;
};

export function pickQuoteContact(contacts: ContactRecord[]): {
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
} {
  // A former or inactive contact is never printed as the customer's contact.
  const active = pickCurrentContact(contacts);
  if (!active) {
    return { contactName: null, contactPhone: null, contactEmail: null };
  }
  const name = `${active.givenName} ${active.familyName}`.trim();
  // Only the active contact's current numbers; a number under identity review is no current destination.
  const current = (n: string | null | undefined, status: string | null | undefined) =>
    active.status === 'active' && status !== 'identity_review' ? n?.trim() || null : null;
  const phone = current(active.phone, active.phoneStatus) || current(active.whatsapp, active.whatsappStatus);
  const email = active.email?.trim() || null;
  return {
    contactName: name || null,
    contactPhone: phone,
    contactEmail: email,
  };
}

function nonZeroDiscountLabel(centavos: string | null | undefined): string | null {
  if (!centavos || !/^-?\d+$/.test(centavos) || BigInt(centavos) === 0n) return null;
  return formatBobCentavos(centavos);
}

/**
 * Builds the printable document from the authorized quote read model (drafts) or from a
 * verified issued snapshot overlay. Discount, units and validity are included when present;
 * bank details / guarantees are never invented.
 */
export function buildQuotePdfDocument(input: QuotePdfBuildInput): QuotePdfDocument {
  const { quote, party, contacts, organizationLegalName } = input;
  const contact = pickQuoteContact(contacts);
  const issuedAt = quote.issuedAt ?? quote.submittedAt ?? quote.createdAt;
  const validUntilIso =
    typeof (quote as QuoteDetailReadModel & { validUntil?: string | null }).validUntil === 'string'
      ? (quote as QuoteDetailReadModel & { validUntil?: string | null }).validUntil
      : null;
  const issuedRevision =
    quote.issuedRevisionNumber != null && quote.issuedRevisionNumber > 0
      ? `Revisión ${quote.issuedRevisionNumber}`
      : null;

  return {
    quoteNumber: quote.quoteNumber,
    documentTitle: 'COTIZACIÓN',
    brandName: 'ISALWA',
    organizationLegalName: organizationLegalName?.trim() || null,
    issuedAtLabel: formatQuotePdfDate(issuedAt),
    validUntilLabel: validUntilIso ? formatQuotePdfDate(validUntilIso) : null,
    issuedRevisionLabel: issuedRevision,
    customerName: party?.displayName?.trim() || 'Cliente',
    contactName: contact.contactName,
    contactPhone: contact.contactPhone,
    contactEmail: contact.contactEmail,
    currency: quote.currency,
    notes: quote.notes?.trim() || null,
    lines: quote.lines.map((line) => ({
      quantity: line.quantity,
      description: line.description,
      unitLabel: line.unitLabel,
      unitPriceLabel: formatBobCentavos(line.unitPriceCentavos),
      discountLabel: nonZeroDiscountLabel(line.discountCentavos),
      lineTotalLabel: formatBobCentavos(line.lineTotalCentavos),
    })),
    subtotalLabel: formatBobCentavos(quote.subtotalCentavos),
    headerDiscountLabel: nonZeroDiscountLabel(quote.headerDiscountCentavos),
    totalLabel: formatBobCentavos(quote.totalCentavos),
    draftLabel: quote.status === 'draft' ? 'Borrador' : null,
  };
}

/** Overlay canonical issued terms onto the authorized read model so the PDF matches the hash. */
export function overlayIssuedQuoteTerms(
  quote: QuoteDetailReadModel,
  record: QuoteRecord,
  lines: QuoteLineRecord[],
): QuoteDetailReadModel {
  return {
    ...quote,
    quoteNumber: record.quoteNumber,
    partyId: record.partyId,
    currency: record.currency,
    notes: record.notes,
    revisionNumber: record.revisionNumber,
    headerDiscountCentavos: record.headerDiscountCentavos.toString(),
    subtotalCentavos: record.subtotalCentavos.toString(),
    totalCentavos: record.totalCentavos.toString(),
    issuedAt: record.issuedAt?.toISOString() ?? quote.issuedAt ?? null,
    issuedDocumentHash: record.issuedDocumentHash,
    issuedRevisionNumber: record.issuedRevisionNumber,
    submittedAt: record.submittedAt?.toISOString() ?? quote.submittedAt,
    status: record.status,
    lines: [...lines]
      .sort((a, b) => a.lineNumber - b.lineNumber)
      .map((line) => ({
        quoteLineId: line.id,
        quoteId: line.quoteId,
        lineNumber: line.lineNumber,
        description: line.description,
        quantity: line.quantity,
        unitLabel: line.unitLabel,
        unitPriceCentavos: line.unitPriceCentavos.toString(),
        discountCentavos: line.discountCentavos.toString(),
        lineTotalCentavos: line.lineTotalCentavos.toString(),
        productRef: line.productRef,
      })),
    // Carried for PDF validity; not yet on the public read-model schema.
    ...(record.validUntil
      ? { validUntil: record.validUntil.toISOString() }
      : { validUntil: null }),
  } as QuoteDetailReadModel & { validUntil: string | null };
}

export async function loadOrganizationLegalName(
  organizationId: string,
): Promise<string | null> {
  const prisma = getOsPrisma();
  if (!prisma) return null;
  const org = await prisma.osOrganization.findUnique({
    where: { id: organizationId },
    select: { legalName: true },
  });
  return org?.legalName ?? null;
}

export class QuotePdfService {
  constructor(
    private readonly partyStore: OsPartyStore,
    private readonly pdf: PdfProvider = createPdfProvider(),
    private readonly commercialStore: OsCommercialStore | null = null,
  ) {}

  /**
   * Renders the authorized PDF. For issued quotes, reloads canonical terms from the
   * commercial store, verifies `issuedDocumentHash`, and refuses with
   * `ISSUED_DOCUMENT_MISMATCH` when the frozen terms no longer match. Draft/legacy
   * quotes still render from the read model without a pin.
   */
  async renderAuthorizedQuote(quote: QuoteDetailReadModel): Promise<{
    bytes: Uint8Array;
    filename: string;
    contentType: 'application/pdf';
    issuedDocumentVerified: boolean;
  }> {
    let documentQuote: QuoteDetailReadModel = quote;
    let issuedDocumentVerified = false;

    const pinnedHash = quote.issuedDocumentHash?.trim() || null;
    if (pinnedHash) {
      if (!this.commercialStore) {
        throw new Error('ISSUED_DOCUMENT_MISMATCH');
      }
      const record = await this.commercialStore.getQuoteInOrg(quote.organizationId, quote.quoteId);
      if (!record?.issuedDocumentHash) {
        throw new Error('ISSUED_DOCUMENT_MISMATCH');
      }
      const lines = await this.commercialStore.listQuoteLines(quote.organizationId, quote.quoteId);
      assertIssuedDocumentHashMatches(record.issuedDocumentHash, {
        quoteNumber: record.quoteNumber,
        revisionNumber: record.revisionNumber,
        partyId: record.partyId,
        currency: record.currency,
        notes: record.notes,
        validUntil: record.validUntil,
        headerDiscountCentavos: record.headerDiscountCentavos,
        lines,
      });
      documentQuote = overlayIssuedQuoteTerms(quote, record, lines);
      issuedDocumentVerified = true;
    }

    const [party, contacts, organizationLegalName] = await Promise.all([
      this.partyStore.getPartyInOrg(documentQuote.organizationId, documentQuote.partyId),
      this.partyStore
        .listContactsForOrgParty(documentQuote.organizationId, documentQuote.partyId)
        .then((page) => page.items),
      loadOrganizationLegalName(documentQuote.organizationId),
    ]);

    const document = buildQuotePdfDocument({
      quote: documentQuote,
      party,
      contacts,
      organizationLegalName,
    });

    try {
      const bytes = await this.pdf.renderQuotePdf({
        quoteNumber: documentQuote.quoteNumber,
        document,
      });
      return {
        bytes,
        filename: sanitizeQuotePdfFilename(documentQuote.quoteNumber),
        contentType: 'application/pdf',
        issuedDocumentVerified,
      };
    } catch (err) {
      if (err instanceof Error && err.message === 'ISSUED_DOCUMENT_MISMATCH') throw err;
      throw new Error('PDF_RENDER_FAILED');
    }
  }
}
