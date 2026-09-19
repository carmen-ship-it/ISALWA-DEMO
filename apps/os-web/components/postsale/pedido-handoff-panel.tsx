'use client';

import { EmptyState, ListRow, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { SearchableSelect } from '@/components/experience/searchable-select';
import {
  POSTSALE_HANDOFF_COPY,
  type PostSaleOperationalEvidence,
  type PostSalePedidoOption,
  productOptionsForPedido,
} from '@/lib/postsale/pedido-context';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';

type PedidoHandoffPanelProps = {
  pedidos: readonly PostSalePedidoOption[];
  selectedOrderId: string | null;
  selectedOrderLineId: string | null;
  onSelectPedido: (orderId: string | null) => void;
  onSelectLine: (orderLineId: string | null) => void;
  evidence?: readonly PostSaleOperationalEvidence[];
  /** When true, product/line select is shown. */
  showProductSelect?: boolean;
};

/**
 * Canonical Pedido handoff root for Producción / Almacén.
 * Human-readable selector only. Commercial facts are inherited, never retyped.
 */
export function PedidoHandoffPanel({
  pedidos,
  selectedOrderId,
  selectedOrderLineId,
  onSelectPedido,
  onSelectLine,
  evidence = [],
  showProductSelect = true,
}: PedidoHandoffPanelProps) {
  const selected = pedidos.find((row) => row.orderId === selectedOrderId) ?? null;
  const pedidoOptions = pedidos.map((row) => ({ id: row.orderId, label: row.optionLabel }));
  const lineOptions = productOptionsForPedido(selected).filter(
    (option) => !isEngineeringFixtureCopy(option.label),
  );

  return (
    <PageSection card className="mb-6 p-6 md:p-8" aria-label={POSTSALE_HANDOFF_COPY.title}>
      <SectionHeader kicker={POSTSALE_HANDOFF_COPY.kicker} title={POSTSALE_HANDOFF_COPY.title} />
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {POSTSALE_HANDOFF_COPY.inheritOnce}
      </p>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {POSTSALE_HANDOFF_COPY.noOpaqueIds}
      </p>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {POSTSALE_HANDOFF_COPY.humanLinkProvenance}
      </p>

      {pedidos.length === 0 ? (
        <div className="mt-6" data-owner-review-state="no-data">
          <EmptyState
            title="Sin pedidos abiertos"
            description="Cuando exista un pedido en esta empresa, aparecerá aquí para abrirlo o seleccionarlo. Un vacío no es falta de permiso."
            example="Abra el pedido desde el cliente. No se inventan líneas ni cantidades."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <SearchableSelect
            id="postsale-pedido"
            label={POSTSALE_HANDOFF_COPY.selectPedido}
            options={pedidoOptions}
            value={selectedOrderId}
            onChange={(id) => {
              onSelectPedido(id);
              onSelectLine(null);
            }}
            placeholder="Buscar por cliente o pedido"
          />
          {showProductSelect && selected ? (
            <SearchableSelect
              id="postsale-pedido-line"
              label={POSTSALE_HANDOFF_COPY.selectProduct}
              options={lineOptions}
              value={selectedOrderLineId}
              onChange={onSelectLine}
              placeholder="Producto del pedido"
            />
          ) : null}
        </div>
      )}

      {selected ? (
        <div className="mt-8 space-y-4" data-postsale-context="pedido">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="info">{POSTSALE_HANDOFF_COPY.customer}</StatusPill>
            <StatusPill tone="neutral">{selected.customerLabel}</StatusPill>
          </div>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-[var(--isalwa-slate)]">{POSTSALE_HANDOFF_COPY.customer}</dt>
              <dd className="mt-1 font-medium text-[var(--isalwa-kiln)]">{selected.customerLabel}</dd>
            </div>
            <div>
              <dt className="text-[var(--isalwa-slate)]">Pedido</dt>
              <dd className="mt-1 font-medium text-[var(--isalwa-kiln)]">{selected.orderLabel}</dd>
            </div>
            <div>
              <dt className="text-[var(--isalwa-slate)]">{POSTSALE_HANDOFF_COPY.quote}</dt>
              <dd className="mt-1 font-medium text-[var(--isalwa-kiln)]">
                {selected.quoteLabel ?? 'Sin cotización vinculada'}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--isalwa-slate)]">{POSTSALE_HANDOFF_COPY.commercial}</dt>
              <dd className="mt-1 font-medium text-[var(--isalwa-kiln)]">
                {[selected.ownerLabel, selected.statusLabel].filter(Boolean).join(' · ') || '—'}
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{POSTSALE_HANDOFF_COPY.lines}</h3>
            <ul className="mt-2" aria-label={POSTSALE_HANDOFF_COPY.quantities}>
              {selected.lines
                .filter((line) => !isEngineeringFixtureCopy(line.productLabel))
                .map((line) => (
                <ListRow key={line.orderLineId} as="li">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{line.productLabel}</p>
                    <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                      {line.quantityLabel ? `Cantidad ${line.quantityLabel}` : 'Cantidad no registrada'}
                    </p>
                  </div>
                </ListRow>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{POSTSALE_HANDOFF_COPY.evidence}</h3>
            {evidence.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                Todavía no hay anotaciones o ingresos registrados para este pedido.
              </p>
            ) : (
              <ul className="mt-2">
                {evidence
                  .filter(
                    (row) =>
                      !isEngineeringFixtureCopy(row.label) &&
                      !isEngineeringFixtureCopy(row.note) &&
                      !isEngineeringFixtureCopy(row.actorLabel),
                  )
                  .map((row, index) => (
                  <ListRow key={`${row.kind}-${index}`} as="li">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{row.label}</p>
                      {row.note ? (
                        <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{row.note}</p>
                      ) : null}
                      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                        {[row.actorLabel, row.recordedAt].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <StatusPill tone="manual">Confirmado</StatusPill>
                  </ListRow>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </PageSection>
  );
}
