import {
  createPdfProvider,
  formatBobCentavos,
  formatQuotePdfDate,
  sanitizeQuotePdfFilename,
  type PdfProvider,
  type QuotePdfDocument,
} from '@isalwa/providers';
import type { QuoteDetailReadModel } from '@isalwa/os-contracts';
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
  const active = contacts.find((c) => c.status === 'active') ?? contacts[0];
  if (!active) {
    return { contactName: null, contactPhone: null, contactEmail: null };
  }
  const name = `${active.givenName} ${active.familyName}`.trim();
  const phone = active.phone?.trim() || active.whatsapp?.trim() || null;
  const email = active.email?.trim() || null;
  return {
    contactName: name || null,
    contactPhone: phone,
    contactEmail: email,
  };
}

export function buildQuotePdfDocument(input: QuotePdfBuildInput): QuotePdfDocument {
  const { quote, party, contacts, organizationLegalName } = input;
  const contact = pickQuoteContact(contacts);
  const issuedAt = quote.submittedAt ?? quote.createdAt;

  return {
    quoteNumber: quote.quoteNumber,
    documentTitle: 'COTIZACIÓN',
    brandName: 'ISALWA',
    organizationLegalName: organizationLegalName?.trim() || null,
    issuedAtLabel: formatQuotePdfDate(issuedAt),
    customerName: party?.displayName?.trim() || 'Cliente',
    contactName: contact.contactName,
    contactPhone: contact.contactPhone,
    contactEmail: contact.contactEmail,
    currency: quote.currency,
    notes: quote.notes?.trim() || null,
    lines: quote.lines.map((line) => ({
      quantity: line.quantity,
      description: line.description,
      unitPriceLabel: formatBobCentavos(line.unitPriceCentavos),
      lineTotalLabel: formatBobCentavos(line.lineTotalCentavos),
    })),
    subtotalLabel: formatBobCentavos(quote.subtotalCentavos),
    totalLabel: formatBobCentavos(quote.totalCentavos),
    draftLabel: quote.status === 'draft' ? 'Borrador' : null,
  };
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
  ) {}

  async renderAuthorizedQuote(quote: QuoteDetailReadModel): Promise<{
    bytes: Uint8Array;
    filename: string;
    contentType: 'application/pdf';
  }> {
    const [party, contacts, organizationLegalName] = await Promise.all([
      this.partyStore.getPartyInOrg(quote.organizationId, quote.partyId),
      this.partyStore.listContactsForOrgParty(quote.organizationId, quote.partyId),
      loadOrganizationLegalName(quote.organizationId),
    ]);

    const document = buildQuotePdfDocument({
      quote,
      party,
      contacts,
      organizationLegalName,
    });

    try {
      const bytes = await this.pdf.renderQuotePdf({
        quoteNumber: quote.quoteNumber,
        document,
      });
      return {
        bytes,
        filename: sanitizeQuotePdfFilename(quote.quoteNumber),
        contentType: 'application/pdf',
      };
    } catch {
      throw new Error('PDF_RENDER_FAILED');
    }
  }
}
