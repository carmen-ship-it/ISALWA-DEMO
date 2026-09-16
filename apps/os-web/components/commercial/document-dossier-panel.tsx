import Link from 'next/link';
import { EmptyState, ListRow, PageSection, SectionHeader } from '@isalwa/ui';
import type { DocumentDossierItem } from '@/lib/commercial/document-dossier';
import { formatTimestamp } from '@/lib/commercial/labels';
import { clienteSectionHref } from '@/lib/commercial/navigation';

const KIND_KICKER: Record<DocumentDossierItem['kind'], string> = {
  quote_pdf: 'Cotización PDF',
  nota_pdf: 'Nota de entrega PDF',
  send_evidence: 'Evidencia de envío',
};

type DocumentDossierPanelProps = {
  items: DocumentDossierItem[];
  partyId?: string;
  /** When embedded inside Cliente 360 section chrome. */
  embedded?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function DocumentDossierPanel({
  items,
  partyId,
  embedded = false,
  emptyTitle = 'Sin documentos vinculados todavía',
  emptyDescription = 'Las cotizaciones, notas de entrega y evidencias de envío aparecen aquí cuando existen registros durables. Los PDF se generan al abrir; no hay archivo binario separado.',
}: DocumentDossierPanelProps) {
  const body =
    items.length === 0 ? (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    ) : (
      <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Documentos vinculados">
        {items.map((item) => (
          <ListRow key={item.id} as="li" className="px-1 py-1">
            <div className="min-w-0 flex-1">
              <p className="isalwa-section-label">{KIND_KICKER[item.kind]}</p>
              <p className="mt-1 font-medium text-[var(--isalwa-kiln)]">{item.label}</p>
              {item.subtitle ? (
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{item.subtitle}</p>
              ) : null}
              {item.occurredAt ? (
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                  {formatTimestamp(item.occurredAt)}
                </p>
              ) : null}
            </div>
            <a
              href={item.href}
              className="isalwa-t-fast shrink-0 text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline"
              {...(item.kind === 'send_evidence'
                ? {}
                : { download: true, rel: 'noopener' })}
            >
              {item.kind === 'send_evidence' ? 'Ver registro' : 'Abrir PDF'}
            </a>
          </ListRow>
        ))}
      </ul>
    );

  if (embedded) {
    return <div data-document-dossier="cliente360">{body}</div>;
  }

  return (
    <PageSection card className="mt-10 bg-white p-8 md:p-10" data-document-dossier="pedido">
      <SectionHeader
        kicker="Documentos"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            Expediente del pedido
          </h2>
        }
      />
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Enlaces a PDF de cotización y nota de entrega, más evidencia de envío cuando está registrada.
        No se duplican archivos: cada PDF se genera desde el registro durable.
      </p>
      <div className="mt-8">{body}</div>
      {partyId ? (
        <p className="mt-6 text-sm text-[var(--isalwa-slate)]">
          Documentos del cliente:{' '}
          <Link
            href={clienteSectionHref(partyId, 'documentos')}
            className="font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:underline"
          >
            ver expediente en Cliente 360
          </Link>
          .
        </p>
      ) : null}
    </PageSection>
  );
}
