import {
  createPdfProvider,
  formatQuotePdfDate,
  sanitizeDeliveryNotePdfFilename,
  type PdfProvider,
  type QuotePdfDocument,
} from '@isalwa/providers';
import type { DeliveryCommandService } from '@isalwa/os-delivery';
import type { OsPartyStore } from '@isalwa/os-party';
import { loadOrganizationLegalName } from './quote-pdf.service';

/**
 * Honest delivery-note PDF. Reuses quote PDF layout with NOTA DE ENTREGA title.
 * No prices — delivery notes are not invoices. Provisional NE-PILOT refs are labels only.
 */
export class DeliveryNotePdfService {
  constructor(
    private readonly deliveryCommands: DeliveryCommandService,
    private readonly partyStore: OsPartyStore,
    private readonly pdf: PdfProvider = createPdfProvider(),
  ) {}

  async renderAuthorizedNote(input: {
    organizationId: string;
    actorMemberId: string;
    effectiveAt: Date;
    noteId: string;
  }): Promise<{ bytes: Uint8Array; filename: string; contentType: 'application/pdf' }> {
    const ctx = {
      organizationId: input.organizationId,
      actorMemberId: input.actorMemberId,
      effectiveAt: input.effectiveAt,
    };
    const note = await this.deliveryCommands.getDeliveryNoteById(ctx, input.noteId);
    const delivery = await this.deliveryCommands.getDeliveryById(ctx, note.deliveryId);
    const lines = await this.deliveryCommands.listLinesForDeliveryNote(ctx, note.id);

    let customerName = 'Cliente';
    try {
      const partyId = await this.deliveryCommands.getOrderPartyId(ctx, note.orderId);
      if (partyId) {
        const party = await this.partyStore.getPartyInOrg(input.organizationId, partyId);
        if (party?.displayName?.trim()) customerName = party.displayName.trim();
      }
    } catch {
      // Keep generic customer label when party is unavailable.
    }

    const documentRef =
      note.externalDocumentNumber?.trim() ||
      `NE-PILOT-${note.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || 'DOC'}`;

    const organizationLegalName = await loadOrganizationLegalName(input.organizationId);
    const document: QuotePdfDocument = {
      quoteNumber: documentRef,
      documentTitle: 'NOTA DE ENTREGA',
      brandName: 'ISALWA',
      organizationLegalName,
      issuedAtLabel: formatQuotePdfDate(note.deliveredAt),
      customerName,
      currency: 'BOB',
      notes: [
        'Registro interno de entrega. No es factura y no calcula impuesto.',
        delivery.deliveredTo ? `Recibió: ${delivery.deliveredTo}` : null,
        'Referencia provisional NE-PILOT si no hay número impreso externo.',
      ]
        .filter(Boolean)
        .join(' '),
      lines: lines.map((line) => ({
        quantity: line.quantity,
        description: line.unitLabel ? `${line.description} (${line.unitLabel})` : line.description,
        unitPriceLabel: '—',
        lineTotalLabel: '—',
      })),
      subtotalLabel: '—',
      totalLabel: '—',
      draftLabel: note.externalDocumentNumber?.startsWith('NE-PILOT')
        ? 'Referencia provisional'
        : 'Registro interno',
    };

    const bytes = await this.pdf.renderQuotePdf({
      quoteNumber: documentRef,
      document,
    });
    return {
      bytes,
      filename: sanitizeDeliveryNotePdfFilename(documentRef),
      contentType: 'application/pdf',
    };
  }
}
