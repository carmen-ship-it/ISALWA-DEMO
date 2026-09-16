/**
 * Cliente360 document links.
 * Surfaces links to Quote PDFs and Nota de Entrega PDFs for the documentos section.
 * Does NOT duplicate binaries or invent document archival. Links to existing API routes.
 */

import type { OsApiClient } from '@/lib/api/os-api-client';

export type DocumentLinkType = 'quote_pdf' | 'delivery_note_pdf';

export type DocumentLink = {
  id: string;
  type: DocumentLinkType;
  label: string;
  href: string;
  createdAt: string;
  /** Related entity for deep link context */
  relatedEntityType: 'quote' | 'order' | 'delivery_note';
  relatedEntityId: string;
  relatedEntityHref: string;
};

export type DocumentLinksOutcome =
  | { status: 'ok'; links: DocumentLink[] }
  | { status: 'unavailable'; message: string }
  | { status: 'forbidden'; message: string };

function quoteDocumentLink(
  partyId: string,
  quoteId: string,
  quoteNumber: string,
  createdAt: string,
): DocumentLink {
  return {
    id: `quote-pdf-${quoteId}`,
    type: 'quote_pdf',
    label: `Cotización ${quoteNumber}`,
    href: `/api/quotes/${encodeURIComponent(quoteId)}/pdf`,
    createdAt,
    relatedEntityType: 'quote',
    relatedEntityId: quoteId,
    relatedEntityHref: `/clientes/${encodeURIComponent(partyId)}/cotizaciones/${encodeURIComponent(quoteId)}`,
  };
}

function deliveryNoteDocumentLink(
  partyId: string,
  orderId: string,
  noteId: string,
  internalDocumentRef: string,
  bornAt: string,
): DocumentLink {
  return {
    id: `delivery-note-pdf-${noteId}`,
    type: 'delivery_note_pdf',
    label: `Nota de entrega ${internalDocumentRef}`,
    href: `/api/delivery-notes/${encodeURIComponent(noteId)}/pdf`,
    createdAt: bornAt,
    relatedEntityType: 'order',
    relatedEntityId: orderId,
    relatedEntityHref: `/clientes/${encodeURIComponent(partyId)}/pedidos/${encodeURIComponent(orderId)}`,
  };
}

/**
 * Load document links for a party's Cliente360 documentos section.
 * Sources: submitted quotes with PDF, issued delivery notes with PDF.
 * Does not invent documents that don't exist.
 */
export async function loadDocumentLinks(
  client: OsApiClient,
  partyId: string,
): Promise<DocumentLinksOutcome> {
  try {
    const links: DocumentLink[] = [];

    // Quotes that have been submitted (have PDF)
    try {
      const quotes = await client.listQuotes({ partyId, limit: 20 });
      for (const quote of quotes.items) {
        if (quote.status === 'submitted' || quote.status === 'accepted') {
          links.push(
            quoteDocumentLink(partyId, quote.quoteId, quote.quoteNumber, quote.createdAt),
          );
        }
      }
    } catch {
      // Quote access may be restricted; continue
    }

    // Orders with delivery notes
    try {
      const orders = await client.listOrders({ partyId, limit: 20 });
      for (const order of orders.items) {
        try {
          const docs = await client.get<{
            notes: Array<{
              id: string;
              internalDocumentRef: string;
              status: 'issued' | 'reversed';
              bornAt: string;
            }>;
          }>('/delivery-notes', { orderId: order.orderId });
          for (const note of docs.notes ?? []) {
            if (note.status === 'issued') {
              links.push(
                deliveryNoteDocumentLink(
                  partyId,
                  order.orderId,
                  note.id,
                  note.internalDocumentRef,
                  note.bornAt,
                ),
              );
            }
          }
        } catch {
          // Delivery notes may not exist or be accessible
        }
      }
    } catch {
      // Order access may be restricted; continue
    }

    // Sort by createdAt descending (most recent first)
    links.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { status: 'ok', links };
  } catch {
    return { status: 'unavailable', message: 'No se pudieron cargar los documentos.' };
  }
}

export const DOCUMENTOS_COPY = {
  title: 'Documentos',
  emptyTitle: 'Sin documentos todavía',
  emptyDescription:
    'Cuando existan cotizaciones presentadas o notas de entrega, sus PDFs aparecerán aquí.',
  unavailable: 'No se pudieron cargar los documentos.',
  forbidden: 'No tiene permiso para ver los documentos de este cliente.',
  quotePdf: 'Cotización PDF',
  deliveryNotePdf: 'Nota de entrega PDF',
  viewRelated: 'Ver registro',
  download: 'Descargar',
} as const;
