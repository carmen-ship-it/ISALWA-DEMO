'use client';

import Link from 'next/link';
import { EmptyState, SectionHeader, StatusPill } from '@isalwa/ui';
import type { DocumentLink, DocumentLinksOutcome } from '@/lib/cliente/document-links';
import { DOCUMENTOS_COPY } from '@/lib/cliente/document-links';

type Cliente360DocumentosProps = {
  outcome: DocumentLinksOutcome;
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function typeLabel(type: DocumentLink['type']): string {
  switch (type) {
    case 'quote_pdf':
      return DOCUMENTOS_COPY.quotePdf;
    case 'delivery_note_pdf':
      return DOCUMENTOS_COPY.deliveryNotePdf;
    default:
      return 'Documento';
  }
}

function typeTone(type: DocumentLink['type']): 'neutral' | 'info' {
  switch (type) {
    case 'quote_pdf':
      return 'info';
    case 'delivery_note_pdf':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function statusTone(
  status: DocumentLink['status'],
): 'neutral' | 'info' | 'success' | 'in_progress' | 'completed' {
  switch (status) {
    case 'enviada':
      return 'in_progress'; // Enviada = active, not success
    case 'emitida':
      return 'completed';
    default:
      return 'neutral';
  }
}

const linkClass =
  'isalwa-t-fast text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:underline';

export function Cliente360Documentos({ outcome }: Cliente360DocumentosProps) {
  return (
    <div data-cliente360-documentos="table">
      <SectionHeader title={DOCUMENTOS_COPY.title} />

      {outcome.status === 'unavailable' ? (
        <p className="text-sm text-[var(--isalwa-slate)]" role="alert">
          {outcome.message}
        </p>
      ) : outcome.status === 'forbidden' ? (
        <p className="text-sm text-[var(--isalwa-slate)]" role="alert">
          {DOCUMENTOS_COPY.forbidden}
        </p>
      ) : outcome.links.length === 0 ? (
        <EmptyState
          title={DOCUMENTOS_COPY.emptyTitle}
          description={DOCUMENTOS_COPY.emptyDescription}
        />
      ) : (
        <div className="mt-4 min-w-0" data-cliente360-documentos-layout="scan">
          {outcome.hasMore || outcome.partial || outcome.links.length > 10 ? (
            <p className="mb-3 text-sm text-[var(--isalwa-slate)]" role="status">
              {DOCUMENTOS_COPY.partial}
            </p>
          ) : null}
          <ul className="m-0 list-none divide-y divide-[var(--isalwa-mist)] p-0">
            {outcome.links.slice(0, 10).map((doc) => (
              <li key={doc.id} className="flex min-w-0 flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={typeTone(doc.type)}>{typeLabel(doc.type)}</StatusPill>
                    <StatusPill tone={statusTone(doc.status)}>{doc.statusLabel}</StatusPill>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-[var(--isalwa-kiln)]">{doc.reference}</p>
                  <p className="mt-1 text-xs text-[var(--isalwa-slate)]">{formatTimestamp(doc.createdAt)}</p>
                  <Link href={doc.relatedEntityHref} className={`${linkClass} mt-1 inline-block`}>
                    {doc.relatedLabel}
                  </Link>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <a
                    href={doc.viewHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 text-xs font-medium text-[var(--isalwa-kiln)]"
                  >
                    {DOCUMENTOS_COPY.viewPdf}
                  </a>
                  <a
                    href={doc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 text-xs font-medium text-[var(--isalwa-kiln)]"
                    download
                  >
                    {DOCUMENTOS_COPY.download}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {outcome.status === 'ok' && (outcome.hasMore || outcome.partial) ? (
        <p className="mt-4 text-sm text-[var(--isalwa-slate)]">{DOCUMENTOS_COPY.partial}</p>
      ) : null}
    </div>
  );
}
