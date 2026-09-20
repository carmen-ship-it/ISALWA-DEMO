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
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--isalwa-mist)] text-[var(--isalwa-slate)]">
                <th className="px-2 py-3 font-medium">{DOCUMENTOS_COPY.colTipo}</th>
                <th className="px-2 py-3 font-medium">{DOCUMENTOS_COPY.colReferencia}</th>
                <th className="px-2 py-3 font-medium">{DOCUMENTOS_COPY.colFecha}</th>
                <th className="px-2 py-3 font-medium">{DOCUMENTOS_COPY.colEstado}</th>
                <th className="px-2 py-3 font-medium">{DOCUMENTOS_COPY.colRelacionado}</th>
                <th className="px-2 py-3 font-medium">{DOCUMENTOS_COPY.colAcciones}</th>
              </tr>
            </thead>
            <tbody>
              {outcome.links.slice(0, 10).map((doc) => (
                <tr key={doc.id} className="border-b border-[var(--isalwa-mist)] align-top">
                  <td className="px-2 py-3">
                    <StatusPill tone={typeTone(doc.type)}>{typeLabel(doc.type)}</StatusPill>
                  </td>
                  <td className="px-2 py-3 font-medium text-[var(--isalwa-kiln)]">
                    {doc.reference}
                  </td>
                  <td className="px-2 py-3 text-[var(--isalwa-slate)]">
                    {formatTimestamp(doc.createdAt)}
                  </td>
                  <td className="px-2 py-3">
                    <StatusPill tone={statusTone(doc.status)}>{doc.statusLabel}</StatusPill>
                  </td>
                  <td className="px-2 py-3">
                    <Link href={doc.relatedEntityHref} className={linkClass}>
                      {doc.relatedLabel}
                    </Link>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={doc.viewHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClass}
                      >
                        {DOCUMENTOS_COPY.viewPdf}
                      </a>
                      <a
                        href={doc.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClass}
                        download
                      >
                        {DOCUMENTOS_COPY.download}
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {outcome.status === 'ok' && outcome.links.length > 10 ? (
        <p className="mt-4 text-sm text-[var(--isalwa-slate)]">
          Mostrando los 10 más recientes de {outcome.links.length} documentos.
        </p>
      ) : null}
    </div>
  );
}
