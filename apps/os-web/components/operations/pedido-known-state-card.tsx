import { PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import {
  PEDIDO_KNOWN_STATE_COPY,
  type PedidoKnownStateView,
} from '@/lib/operations/pedido-known-state';

type PedidoKnownStateCardProps = {
  view: PedidoKnownStateView;
};

function FactBlock({
  label,
  items,
  empty,
  tone,
}: {
  label: string;
  items: readonly string[];
  empty: string;
  tone?: 'warning' | 'neutral' | 'info' | 'success' | 'manual';
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="isalwa-section-label">{label}</p>
        {tone ? <StatusPill tone={tone}>{items.length}</StatusPill> : null}
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">{empty}</p>
      ) : (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Compact ESTADO CONOCIDO intelligence — factual lists only.
 */
export function PedidoKnownStateCard({ view }: PedidoKnownStateCardProps) {
  return (
    <PageSection card className="mt-10 bg-white p-8 md:p-10" aria-label={PEDIDO_KNOWN_STATE_COPY.heading}>
      <SectionHeader
        kicker="Pedido"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            {PEDIDO_KNOWN_STATE_COPY.heading}
          </h2>
        }
      />
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <FactBlock
          label={PEDIDO_KNOWN_STATE_COPY.confirmado}
          items={view.confirmado}
          empty={PEDIDO_KNOWN_STATE_COPY.emptyConfirmado}
          tone="success"
        />
        <FactBlock
          label={PEDIDO_KNOWN_STATE_COPY.pendiente}
          items={view.pendienteDeConfirmar}
          empty={PEDIDO_KNOWN_STATE_COPY.emptyPendiente}
          tone="warning"
        />
        <FactBlock
          label={PEDIDO_KNOWN_STATE_COPY.noRegistrado}
          items={view.noRegistrado}
          empty={PEDIDO_KNOWN_STATE_COPY.emptyMissing}
          tone="neutral"
        />
        <div className="space-y-6">
          <div>
            <p className="isalwa-section-label">{PEDIDO_KNOWN_STATE_COPY.recomendacion}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
              {view.recomendacion ?? 'Sin recomendación adicional a partir de los hechos cargados.'}
            </p>
          </div>
          <div>
            <p className="isalwa-section-label">{PEDIDO_KNOWN_STATE_COPY.aQuienPreguntar}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
              {view.aQuienPreguntar ?? 'Sin responsable canónico identificado en este registro.'}
            </p>
          </div>
        </div>
      </div>
    </PageSection>
  );
}
