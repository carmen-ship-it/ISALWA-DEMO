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

const linkClass =
  'isalwa-t-fast text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:underline';

export function Cliente360Documentos({ outcome }: Cliente360DocumentosProps) {
  return (
    <div>
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
        <ul className="divide-y divide-[var(--isalwa-mist)]">
          {outcome.links.slice(0, 10).map((doc) => (
            <li key={doc.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={typeTone(doc.type)}>{typeLabel(doc.type)}</StatusPill>
                    <span className="text-sm font-medium text-[var(--isalwa-kiln)]">
                      {doc.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--isalwa-slate)]">
                    {formatTimestamp(doc.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <a
                    href={doc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  >
                    {DOCUMENTOS_COPY.download}
                  </a>
                  <Link href={doc.relatedEntityHref} className={linkClass}>
                    {DOCUMENTOS_COPY.viewRelated}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {outcome.status === 'ok' && outcome.links.length > 10 ? (
        <p className="mt-4 text-sm text-[var(--isalwa-slate)]">
          Mostrando los 10 más recientes de {outcome.links.length} documentos.
        </p>
      ) : null}
    </div>
  );
}
