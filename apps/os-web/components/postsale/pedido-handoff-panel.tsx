'use client';

import { EmptyState, ListRow, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { SearchableSelect } from '@/components/experience/searchable-select';
import {
  POSTSALE_HANDOFF_COPY,
  type PostSaleOperationalEvidence,
  type PostSalePedidoOption,
  productOptionsForPedido,
} from '@/lib/postsale/pedido-context';
import { presentHumanCopy } from '@/lib/demo/human-facing-copy';
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
  /**
   * section — titled handoff block (Producción).
   * field — single Pedido control for employee forms (Almacén ingreso); no duplicated Pedido chrome.
   */
  density?: 'section' | 'field';
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
  density = 'section',
}: PedidoHandoffPanelProps) {
  const selected = pedidos.find((row) => row.orderId === selectedOrderId) ?? null;
  const pedidoOptions = pedidos.map((row) => ({ id: row.orderId, label: row.optionLabel }));
  // Authoritative Pedido lines — do not hide selectable ingreso lines behind search no-match copy.
  const lineOptions = productOptionsForPedido(selected).map((option) => ({
    id: option.id,
    label: presentHumanCopy(option.label) || option.label,
  }));
  const fieldOnly = density === 'field';
  const lineEmptyMessage =
    selected && selected.lines.length === 0
      ? 'Este pedido no tiene líneas disponibles para registrar ingreso.'
      : selected && lineOptions.length === 0
        ? 'Ninguna línea de este pedido está disponible para registrar ingreso.'
        : null;

  const selectors = (
    <>
      {pedidos.length === 0 ? (
        <div className={fieldOnly ? undefined : 'mt-6'} data-owner-review-state="no-data">
          <EmptyState
            title="Sin pedidos abiertos"
            description="Cuando exista un pedido en esta empresa, aparecerá aquí para abrirlo o seleccionarlo. Un vacío no es falta de permiso."
            example="Abra el pedido desde el cliente. No se inventan líneas ni cantidades."
          />
        </div>
      ) : (
        <div className={fieldOnly ? 'space-y-4' : 'mt-6 space-y-4'}>
          {selected ? (
            <div>
              {fieldOnly ? <p className="isalwa-section-label">Pedido seleccionado</p> : null}
              <p className="mt-1 text-base font-semibold text-[var(--isalwa-kiln)]">{selected.orderLabel}</p>
              <p className="text-sm text-[var(--isalwa-slate)]">{selected.customerLabel}</p>
              <button
                type="button"
                className="mt-2 inline-flex h-8 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-xs font-medium text-[var(--isalwa-kiln)]"
                onClick={() => {
                  onSelectPedido(null);
                  onSelectLine(null);
                }}
              >Cambiar</button>
            </div>
          ) : (
            <SearchableSelect
              id="postsale-pedido"
              label="Pedido"
              labelVisibility={fieldOnly ? 'visible' : 'sr-only'}
              options={pedidoOptions}
              value={selectedOrderId}
              onChange={(id) => {
                onSelectPedido(id);
                onSelectLine(null);
              }}
              placeholder="Buscar por cliente o pedido"
            />
          )}
          {showProductSelect && selected ? (
            lineEmptyMessage ? (
              <div data-warehouse-line-state="empty" role="status">
                <p className="isalwa-section-label">Producto / línea</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">{lineEmptyMessage}</p>
              </div>
            ) : (
              <SearchableSelect
                id="postsale-pedido-line"
                label="Producto / línea"
                options={lineOptions}
                value={selectedOrderLineId}
                onChange={onSelectLine}
                placeholder="Producto del pedido"
                emptyOptionsLabel="Este pedido no tiene líneas disponibles para registrar ingreso."
                noMatchLabel="Ningún resultado coincide"
              />
            )
          ) : null}
        </div>
      )}
    </>
  );

  if (fieldOnly) {
    return (
      <div className="mb-6 space-y-4" aria-label="Pedido">
        {selectors}
      </div>
    );
  }

  return (
    <PageSection card className="mb-6 p-6 md:p-8" aria-label="Pedido">
      <SectionHeader kicker={POSTSALE_HANDOFF_COPY.kicker} title={selected ? 'Pedido seleccionado' : 'Pedido'} />
      {selectors}
      {selected ? (
        <div className="mt-8 space-y-4" data-postsale-context="pedido">
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-[var(--isalwa-slate)]">{POSTSALE_HANDOFF_COPY.customer}</dt>
              <dd className="mt-1 font-medium text-[var(--isalwa-kiln)]">{selected.customerLabel}</dd>
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
              {selected.lines.map((line) => (
                <ListRow key={line.orderLineId} as="li">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                      {presentHumanCopy(line.productLabel) || line.productLabel}
                    </p>
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
