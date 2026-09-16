import { ENTREGA_PANEL_COPY } from '@isalwa/os-contracts';
import type { DeliveryNoteRecord, NoteLineRecord } from '@isalwa/os-delivery';
import type { OsPartyStore, PartyRecord } from '@isalwa/os-party';
import { getOsPrisma } from '@isalwa/os-database';
import {
  createPdfProvider,
  formatDeliveryNotePdfDate,
  sanitizeDeliveryNotePdfFilename,
  type DeliveryNotePdfDocument,
  type PdfProvider,
} from '@isalwa/providers';

export type DeliveryNotePdfBuildInput = {
  note: DeliveryNoteRecord;
  lines: NoteLineRecord[];
  party: PartyRecord | null;
  orderNumber: string | null;
  organizationLegalName: string | null;
};

export function buildDeliveryNotePdfDocument(input: DeliveryNotePdfBuildInput): DeliveryNotePdfDocument {
  const { note, lines, party, orderNumber, organizationLegalName } = input;
  return {
    documentTitle: 'NOTA DE ENTREGA',
    brandName: 'ISALWA',
    organizationLegalName: organizationLegalName?.trim() || null,
    internalDocumentRef: note.internalDocumentRef,
    displayDocumentNumber: note.displayDocumentNumber,
    issuedAtLabel: formatDeliveryNotePdfDate(note.bornAt),
    customerName: party?.displayName?.trim() || 'Cliente',
    orderRef: orderNumber?.trim() || note.orderId,
    recipient: note.recipient,
    deliveredBy: note.deliveredBy,
    receivedBy: note.receivedBy,
    observations: note.observations,
    lines: lines.map((line) => ({
      quantity: line.quantity,
      description: line.description,
      unitLabel: line.unitLabel,
    })),
    numberingDisclaimer: ENTREGA_PANEL_COPY.provisionalDisclaimer,
  };
}

async function loadOrganizationLegalName(organizationId: string): Promise<string | null> {
  const prisma = getOsPrisma();
  if (!prisma) return null;
  const org = await prisma.osOrganization.findUnique({
    where: { id: organizationId },
    select: { legalName: true },
  });
  return org?.legalName ?? null;
}

export class DeliveryNotePdfService {
  constructor(
    private readonly partyStore: OsPartyStore,
    private readonly pdf: PdfProvider = createPdfProvider(),
  ) {}

  async renderAuthorizedNote(input: {
    note: DeliveryNoteRecord;
    lines: NoteLineRecord[];
    orderNumber: string | null;
  }): Promise<{ bytes: Uint8Array; filename: string; contentType: 'application/pdf' }> {
    const [party, organizationLegalName] = await Promise.all([
      this.partyStore.getPartyInOrg(input.note.organizationId, input.note.partyId),
      loadOrganizationLegalName(input.note.organizationId),
    ]);
    const document = buildDeliveryNotePdfDocument({
      note: input.note,
      lines: input.lines,
      party,
      orderNumber: input.orderNumber,
      organizationLegalName,
    });
    try {
      const bytes = await this.pdf.renderDeliveryNotePdf({
        internalDocumentRef: input.note.internalDocumentRef,
        document,
      });
      return {
        bytes,
        filename: sanitizeDeliveryNotePdfFilename(input.note.internalDocumentRef),
        contentType: 'application/pdf',
      };
    } catch {
      throw new Error('PDF_RENDER_FAILED');
    }
  }
}
