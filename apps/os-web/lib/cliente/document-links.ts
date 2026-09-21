/**
 * Cliente360 document links.
 * Surfaces links to Quote PDFs and Nota de Entrega PDFs for the documentos section.
 * Does NOT duplicate binaries or invent document archival. Links to existing API routes.
 */

import type { OsApiClient } from '@/lib/api/os-api-client';
import {
  presentDeliveryNoteLabel,
  presentDeliveryNoteReference,
} from '@/lib/commercial/human-facing';

export type DocumentLinkType = 'quote_pdf' | 'delivery_note_pdf';

export type DocumentLinkStatus = 'disponible' | 'enviada' | 'emitida';

export type DocumentLink = {
  id: string;
  type: DocumentLinkType;
  /** Human reference (quote number / NE ref) — never opaque storage IDs. */
  label: string;
  reference: string;
  href: string;
  viewHref: string;
  createdAt: string;
  status: DocumentLinkStatus;
  statusLabel: string;
  relatedLabel: string;
  /** Related entity for deep link context */
  relatedEntityType: 'quote' | 'order' | 'delivery_note';
  relatedEntityId: string;
  relatedEntityHref: string;
};

export type DocumentLinksOutcome =
  | { status: 'ok'; links: DocumentLink[]; partial: boolean; hasMore: boolean }
  | { status: 'unavailable'; message: string }
  | { status: 'forbidden'; message: string };

export const DOCUMENT_LINKS_CAP = 25;
const DOCUMENT_SOURCE_FANOUT = 10;
const OPPORTUNITY_TITLE_FETCH_MAX = 10;
const DELIVERY_NOTES_LIST_LIMIT = 25;

function quoteDocumentLink(
  partyId: string,
  quoteId: string,
  quoteNumber: string,
  createdAt: string,
  opportunityTitle: string | null,
  sent: boolean,
): DocumentLink {
  const pdf = `/api/quotes/${encodeURIComponent(quoteId)}/pdf`;
  return {
    id: `quote-pdf-${quoteId}`,
    type: 'quote_pdf',
    label: `Cotización ${quoteNumber}`,
    reference: quoteNumber,
    href: pdf,
    viewHref: `${pdf}?disposition=inline`,
    createdAt,
    status: sent ? 'enviada' : 'disponible',
    statusLabel: sent ? 'Enviada' : 'Disponible',
    relatedLabel: opportunityTitle ? `Oportunidad · ${opportunityTitle}` : 'Cotización',
    relatedEntityType: 'quote',
    relatedEntityId: quoteId,
    relatedEntityHref: `/clientes/${encodeURIComponent(partyId)}/cotizaciones/${encodeURIComponent(quoteId)}`,
  };
}

function deliveryNoteDocumentLink(
  partyId: string,
  orderId: string,
  orderNumber: string | null,
  noteId: string,
  internalDocumentRef: string,
  bornAt: string,
): DocumentLink {
  const pdf = `/api/delivery-notes/${encodeURIComponent(noteId)}/pdf`;
  return {
    id: `delivery-note-pdf-${noteId}`,
    type: 'delivery_note_pdf',
    label: presentDeliveryNoteLabel({ internalDocumentRef, orderNumber }),
    reference: presentDeliveryNoteReference({ internalDocumentRef, orderNumber }),
    href: pdf,
    viewHref: pdf,
    createdAt: bornAt,
    status: 'emitida',
    statusLabel: 'Emitida',
    relatedLabel: orderNumber ? `Pedido · ${orderNumber}` : 'Pedido',
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
export type LoadDocumentLinksOptions = {
  commercialQuery?: Record<string, string>;
  /** Ops View As: skip quote PDF negotiation links; keep delivery-note links. */
  suppressNegotiation?: boolean;
};


function sourcePageTruncated(
  list: { items: unknown[]; meta?: { hasMore?: boolean } },
  fanout: number,
): boolean {
  if (list.meta?.hasMore) return true;
  if (list.meta && list.meta.hasMore === false) return false;
  return list.items.length >= fanout;
}

export async function loadDocumentLinks(
  client: OsApiClient,
  partyId: string,
  options: LoadDocumentLinksOptions = {},
): Promise<DocumentLinksOutcome> {
  const commercialQuery = options.commercialQuery ?? {};
  const suppressNegotiation = options.suppressNegotiation === true;
  try {
    const links: DocumentLink[] = [];
    const sentQuoteIds = new Set<string>();
    let truncated = false;

    try {
      const timeline = await client.listPartyTimeline(partyId, { limit: 50 });
      for (const entry of timeline.items) {
        if (entry.eventType !== 'quote.send_recorded') continue;
        const quoteId =
          typeof entry.facts.quoteId === 'string' ? entry.facts.quoteId.trim() : '';
        if (quoteId) sentQuoteIds.add(quoteId);
      }
    } catch {
      // Timeline optional for status enrichment.
    }

    const opportunityTitles = new Map<string, string>();

    if (!suppressNegotiation) {
      try {
        let quotes;
        try {
          quotes = await client.listQuotes({
            partyId,
            limit: DOCUMENT_SOURCE_FANOUT,
            visibility: 'org',
            ...commercialQuery,
          });
        } catch {
          quotes = await client.listQuotes({
            partyId,
            limit: DOCUMENT_SOURCE_FANOUT,
            ...commercialQuery,
          });
        }
        if (sourcePageTruncated(quotes, DOCUMENT_SOURCE_FANOUT)) {
          truncated = true;
        }
        const opportunityIds = [
          ...new Set(
            quotes.items
              .map((quote) => quote.opportunityId)
              .filter((id): id is string => Boolean(id)),
          ),
        ].slice(0, DOCUMENT_SOURCE_FANOUT);
        const titleIds = opportunityIds.slice(0, OPPORTUNITY_TITLE_FETCH_MAX);
        await Promise.all(
          titleIds.map(async (opportunityId) => {
            try {
              const { opportunity } = await client.getOpportunity(opportunityId);
              opportunityTitles.set(opportunityId, opportunity.title);
            } catch {
              // Title enrichment is best-effort.
            }
          }),
        );

        for (const quote of quotes.items) {
          if (quote.status === 'submitted' || quote.status === 'accepted') {
            links.push(
              quoteDocumentLink(
                partyId,
                quote.quoteId,
                quote.quoteNumber,
                quote.submittedAt ?? quote.createdAt,
                quote.opportunityId
                  ? opportunityTitles.get(quote.opportunityId) ?? null
                  : null,
                sentQuoteIds.has(quote.quoteId),
              ),
            );
          }
        }
      } catch {
        // Quote access may be restricted; continue
      }
    }

    try {
      let orders;
      try {
        orders = await client.listOrders({
          partyId,
          limit: DOCUMENT_SOURCE_FANOUT,
          visibility: 'org',
          ...commercialQuery,
        });
      } catch {
        orders = await client.listOrders({
          partyId,
          limit: DOCUMENT_SOURCE_FANOUT,
          ...commercialQuery,
        });
      }
      if (sourcePageTruncated(orders, DOCUMENT_SOURCE_FANOUT)) {
        truncated = true;
      }
      for (const order of orders.items) {
        try {
          const docs = await client.get<{
            notes: Array<{
              id: string;
              internalDocumentRef: string;
              status: 'issued' | 'reversed';
              bornAt: string;
            }>;
          }>('/delivery-notes', { orderId: order.orderId, limit: DELIVERY_NOTES_LIST_LIMIT });
          const notes = docs.notes ?? [];
          if (notes.length >= DELIVERY_NOTES_LIST_LIMIT) truncated = true;
          for (const note of notes) {
            if (note.status === 'issued') {
              links.push(
                deliveryNoteDocumentLink(
                  partyId,
                  order.orderId,
                  order.orderNumber,
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

    links.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const capped = links.length > DOCUMENT_LINKS_CAP;
    if (capped) truncated = true;
    const page = capped ? links.slice(0, DOCUMENT_LINKS_CAP) : links;

    return { status: 'ok', links: page, partial: truncated, hasMore: truncated };
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
  quotePdf: 'Cotización',
  deliveryNotePdf: 'Nota de entrega',
  viewRelated: 'Ver registro',
  download: 'Descargar',
  viewPdf: 'Ver PDF',
  colTipo: 'Tipo',
  colReferencia: 'Referencia',
  colFecha: 'Fecha',
  colEstado: 'Estado',
  colRelacionado: 'Relacionado con',
  colAcciones: 'Acciones',
  partial:
    'Mostrando documentos recientes. Puede haber más; esta vista no es un inventario completo.',
} as const;
