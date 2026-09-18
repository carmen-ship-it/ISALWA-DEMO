import type { PartyTimelineEntryReadModel, QuoteSummaryReadModel } from '@isalwa/os-contracts';
import { quoteHref } from '@/lib/commercial/navigation';
import { presentDeliveryNoteLabel } from '@/lib/commercial/human-facing';
import { quoteManualSendHistoryLabel } from '@/lib/commercial/quote-manual-send';
import { sortTimelineChronologicalDesc } from '@/lib/commercial/timeline-labels';

export type DocumentDossierKind = 'quote_pdf' | 'nota_pdf' | 'send_evidence';

export type DocumentDossierItem = {
  id: string;
  kind: DocumentDossierKind;
  label: string;
  subtitle: string | null;
  /** Metadata link — existing PDF route or quote detail. Never a new blob store. */
  href: string;
  occurredAt: string | null;
};

export type DeliveryNoteDossierSource = {
  id: string;
  internalDocumentRef: string;
  bornAt: string;
  status?: 'issued' | 'reversed';
};

export function quotePdfHref(quoteId: string): string {
  return `/api/quotes/${encodeURIComponent(quoteId)}/pdf`;
}

export function deliveryNotePdfHref(deliveryNoteId: string): string {
  return `/api/delivery-notes/${encodeURIComponent(deliveryNoteId)}/pdf`;
}

/**
 * Compose a Client/Pedido document dossier from durable metadata + existing PDF routes.
 * Does not archive binary blobs; PDFs are rendered on demand from SoR records.
 */
export function composeDocumentDossier(input: {
  partyId: string;
  quotes?: readonly QuoteSummaryReadModel[];
  deliveryNotes?: readonly DeliveryNoteDossierSource[];
  timelineEntries?: readonly PartyTimelineEntryReadModel[];
  /** When set, only include quotes matching this quoteId (Pedido source quote). */
  quoteIdFilter?: string | null;
}): DocumentDossierItem[] {
  const items: DocumentDossierItem[] = [];
  const quoteFilter = input.quoteIdFilter?.trim() || null;

  for (const quote of input.quotes ?? []) {
    if (quoteFilter && quote.quoteId !== quoteFilter) continue;
    items.push({
      id: `quote-pdf:${quote.quoteId}`,
      kind: 'quote_pdf',
      label: `Cotización ${quote.quoteNumber}`,
      subtitle: 'PDF · generado al abrir',
      href: quotePdfHref(quote.quoteId),
      occurredAt: quote.submittedAt ?? quote.createdAt,
    });
  }

  for (const note of input.deliveryNotes ?? []) {
    if (note.status === 'reversed') continue;
    items.push({
      id: `nota-pdf:${note.id}`,
      kind: 'nota_pdf',
      label: presentDeliveryNoteLabel({ internalDocumentRef: note.internalDocumentRef }),
      subtitle: 'PDF · generado al abrir',
      href: deliveryNotePdfHref(note.id),
      occurredAt: note.bornAt,
    });
  }

  for (const entry of input.timelineEntries ?? []) {
    if (entry.eventType !== 'quote.send_recorded') continue;
    const quoteId =
      typeof entry.facts.quoteId === 'string' ? entry.facts.quoteId.trim() : '';
    if (!quoteId) continue;
    if (quoteFilter && quoteId !== quoteFilter) continue;
    const quoteNumber =
      typeof entry.facts.quoteNumber === 'string' && entry.facts.quoteNumber
        ? entry.facts.quoteNumber
        : null;
    const channel = typeof entry.facts.channel === 'string' ? entry.facts.channel : null;
    items.push({
      id: `send:${entry.entryId}`,
      kind: 'send_evidence',
      label: quoteManualSendHistoryLabel(channel),
      subtitle: quoteNumber ? `Cotización ${quoteNumber}` : 'Evidencia de envío registrada',
      href: quoteHref(input.partyId, quoteId),
      occurredAt: entry.occurredAt,
    });
  }

  return sortTimelineChronologicalDesc(
    items.map((item) => ({
      ...item,
      occurredAt: item.occurredAt ?? '1970-01-01T00:00:00.000Z',
    })),
  ).map(({ occurredAt, ...rest }) => ({
    ...rest,
    occurredAt: occurredAt === '1970-01-01T00:00:00.000Z' ? null : occurredAt,
  }));
}
