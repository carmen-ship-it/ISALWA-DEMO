import { EmptyState, PageSection, SectionHeader, Skeleton, StatusPill, Timeline } from '@isalwa/ui';
import { ENTREGA_PANEL_COPY } from '@isalwa/os-contracts';
import { OpsDeskSurface } from '@/components/production/ops-desk-surface';
import { buildEntregaChronology, type EntregaChronologyInput } from '@/lib/delivery/chronology';

/**
 * Entrega panel. Mounted on /entregas. Not mounted on the pedido page.
 * Numbering stays unknown. This is an internal record, not an official number.
 * Warehouse exit and customer delivery stay in separate sections.
 */

export type EntregaLineView = {
  description: string;
  quantity: number;
  unitLabel: string | null;
};

export type EntregaEvidenceView = {
  role: 'commercial_coordination' | 'accounting_payment' | 'warehouse_outbound' | 'delivery_confirmation';
  actorLabel: string;
  reference: string | null;
  note: string | null;
  paymentState: 'reference' | 'authorized_exception' | null;
  confirmedLedgerPayment: false;
  recipient: string | null;
  signatureReference: string | null;
};

export type EntregaPanelStatus = 'ready' | 'empty' | 'loading' | 'error' | 'permission';

export type EntregaPanelProps = {
  status?: EntregaPanelStatus;
  warehouseExits: Array<{
    id?: string;
    exitedAt: string;
    recordedByLabel: string;
    sourceLabel?: string;
    notes: string | null;
    lines: EntregaLineView[];
  }>;
  deliveries: Array<{
    id?: string;
    deliveredAt: string;
    deliveredTo: string | null;
    recordedByLabel: string;
    sourceLabel?: string;
    notes: string | null;
    lines: EntregaLineView[];
    evidence: EntregaEvidenceView[];
  }>;
};

const ROLE_LABEL: Record<EntregaEvidenceView['role'], string> = {
  commercial_coordination: 'Coordinación comercial',
  accounting_payment: 'Evidencia de pago',
  warehouse_outbound: 'Nota de salida de almacén',
  delivery_confirmation: 'Confirmación de entrega',
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

function LineList({ lines }: { lines: EntregaLineView[] }) {
  if (lines.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{ENTREGA_PANEL_COPY.noLines}</p>
    );
  }
  return (
    <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Cantidades conocidas">
      {lines.map((line, index) => (
        <li key={`${line.description}:${line.quantity}:${index}`} className="flex items-baseline justify-between gap-4 py-3 text-sm">
          <span className="text-[var(--isalwa-kiln)]">{line.description}</span>
          <span className="text-[var(--isalwa-slate)]">
            {line.quantity}
            {line.unitLabel ? ` ${line.unitLabel}` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Chronology({ warehouseExits, deliveries }: EntregaChronologyInput) {
  const items = buildEntregaChronology({ warehouseExits, deliveries });
  return (
    <section aria-label="Cronología" className="space-y-4">
      <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
        {ENTREGA_PANEL_COPY.chronology}
      </h2>
      <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {ENTREGA_PANEL_COPY.partialDeliveries}
      </p>
      {items.length === 0 ? (
        <EmptyState
          title={ENTREGA_PANEL_COPY.chronologyEmpty}
          description={ENTREGA_PANEL_COPY.internalRecord}
          example={ENTREGA_PANEL_COPY.noteDoesNotPredate}
        />
      ) : (
        <Timeline
          items={items.map((item) => ({
            id: item.id,
            label: item.label,
            meta: <span className="text-sm text-[var(--isalwa-slate)]">{formatWhen(item.occurredAt)}</span>,
            body: (
              <span>
                {item.detail} Registró {item.recordedByLabel}.
                {item.sourceLabel ? ` Origen: ${item.sourceLabel}.` : ''}
              </span>
            ),
          }))}
        />
      )}
    </section>
  );
}

export function EntregaPanel({ status = 'ready', warehouseExits, deliveries }: EntregaPanelProps) {
  const surface = status === 'ready' && warehouseExits.length === 0 && deliveries.length === 0 ? 'empty' : status;

  if (surface === 'loading') {
    return (
      <div className="space-y-6" data-entrega-boundary="loading" aria-busy="true" aria-live="polite">
        <p className="text-sm text-[var(--isalwa-slate)]">{ENTREGA_PANEL_COPY.loading}</p>
        <Skeleton h={18} rounded="pill" />
        <Skeleton h={96} rounded="panel" />
      </div>
    );
  }

  if (surface === 'error') {
    return (
      <div data-entrega-boundary="error">
        <EmptyState
          title={ENTREGA_PANEL_COPY.loadError}
          description={ENTREGA_PANEL_COPY.internalRecord}
        />
      </div>
    );
  }

  if (surface === 'permission') {
    return (
      <div data-entrega-boundary="permission" role="alert" data-owner-review-state="not-authorized">
        <EmptyState
          title={ENTREGA_PANEL_COPY.permissionDenied}
          description={ENTREGA_PANEL_COPY.internalRecord}
          example="Con el permiso de entregas en la sesión, verá salidas y notas internas de esta empresa."
        />
      </div>
    );
  }

  return (
    <OpsDeskSurface className="space-y-10" data-entrega-boundary={deliveries.length > 0 ? 'delivered' : 'before-delivery'}>
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="neutral">Sin número oficial</StatusPill>
        <StatusPill tone="neutral">No es factura</StatusPill>
        <StatusPill tone="manual">No confirma pago en el libro</StatusPill>
      </div>

      <p className="max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {ENTREGA_PANEL_COPY.beforeDelivery} {ENTREGA_PANEL_COPY.orderDoesNotEmit}{' '}
        {ENTREGA_PANEL_COPY.numberingUnknown} {ENTREGA_PANEL_COPY.externalNumberPreserved}{' '}
        {ENTREGA_PANEL_COPY.factoryNoteDistinct} {ENTREGA_PANEL_COPY.notInvoice}{' '}
        {ENTREGA_PANEL_COPY.noSignatureMethod} {ENTREGA_PANEL_COPY.evidenceSeparate}
      </p>

      {warehouseExits.length === 0 && deliveries.length === 0 ? (
        <div data-owner-review-state="no-data">
          <EmptyState
            title="Todavía no hay entregas registradas"
            description={ENTREGA_PANEL_COPY.internalRecord}
            example={ENTREGA_PANEL_COPY.beforeDelivery}
          />
        </div>
      ) : null}

      <Chronology warehouseExits={warehouseExits} deliveries={deliveries} />

      <PageSection card className="p-6 md:p-8">
        <SectionHeader
          kicker={ENTREGA_PANEL_COPY.kicker}
          title={
            <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
              {ENTREGA_PANEL_COPY.warehouseTitle}
            </h2>
          }
          action={<StatusPill tone="info">No es entrega</StatusPill>}
        />
        <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {ENTREGA_PANEL_COPY.warehouseDistinct}
        </p>
        {warehouseExits.length === 0 ? (
          <div data-owner-review-state="no-data" className="mt-8">
            <EmptyState
              title="Todavía no hay salida de almacén"
              description={ENTREGA_PANEL_COPY.warehouseDistinct}
              example={ENTREGA_PANEL_COPY.orderDoesNotEmit}
            />
          </div>
        ) : (
          <ul className="mt-8 space-y-8" aria-label="Salidas de almacén">
            {warehouseExits.map((exit) => (
              <li key={exit.id ?? exit.exitedAt} className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone="neutral">Sin número</StatusPill>
                </div>
                <dl className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <dt className="isalwa-section-label">Salió</dt>
                    <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatWhen(exit.exitedAt)}</dd>
                  </div>
                  <div>
                    <dt className="isalwa-section-label">Registró</dt>
                    <dd className="mt-2 text-[var(--isalwa-kiln)]">{exit.recordedByLabel}</dd>
                  </div>
                  <div>
                    <dt className="isalwa-section-label">Origen</dt>
                    <dd className="mt-2 text-[var(--isalwa-kiln)]">{exit.sourceLabel ?? 'Registro interno'}</dd>
                  </div>
                </dl>
                {exit.notes ? <p className="text-sm text-[var(--isalwa-slate)]">{exit.notes}</p> : null}
                <LineList lines={exit.lines} />
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      <PageSection card className="p-6 md:p-8">
        <SectionHeader
          kicker={ENTREGA_PANEL_COPY.kicker}
          title={
            <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
              {ENTREGA_PANEL_COPY.title}
            </h2>
          }
        />
        <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {ENTREGA_PANEL_COPY.beforeDelivery} {ENTREGA_PANEL_COPY.paymentNotRequired}{' '}
          {ENTREGA_PANEL_COPY.exceptionNotPayment}
        </p>
        {deliveries.length === 0 ? (
          <div data-owner-review-state="no-data" className="mt-8">
            <EmptyState
              title={ENTREGA_PANEL_COPY.noDeliveryYet}
              description={ENTREGA_PANEL_COPY.beforeDelivery}
              example={ENTREGA_PANEL_COPY.orderDoesNotEmit}
            />
          </div>
        ) : (
          <ul className="mt-8 space-y-10" aria-label="Entregas al cliente">
            {deliveries.map((delivery) => {
              const payment = delivery.evidence.find((item) => item.role === 'accounting_payment') ?? null;
              return (
                <li key={delivery.id ?? delivery.deliveredAt} className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone="success">Entregada</StatusPill>
                    <StatusPill tone="neutral">Sin número</StatusPill>
                    <StatusPill tone="neutral">No es factura</StatusPill>
                    {payment?.paymentState === 'authorized_exception' ? (
                      <StatusPill tone="warning">Excepción. No es un pago confirmado</StatusPill>
                    ) : (
                      <StatusPill tone="manual">Sin confirmación de pago</StatusPill>
                    )}
                  </div>
                  <p className="text-sm text-[var(--isalwa-slate)]">{ENTREGA_PANEL_COPY.delivered}</p>
                  <dl className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <dt className="isalwa-section-label">Entregada</dt>
                      <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatWhen(delivery.deliveredAt)}</dd>
                    </div>
                    <div>
                      <dt className="isalwa-section-label">Registró</dt>
                      <dd className="mt-2 text-[var(--isalwa-kiln)]">{delivery.recordedByLabel}</dd>
                    </div>
                    <div>
                      <dt className="isalwa-section-label">Origen</dt>
                      <dd className="mt-2 text-[var(--isalwa-kiln)]">{delivery.sourceLabel ?? 'Registro interno'}</dd>
                    </div>
                    {delivery.deliveredTo ? (
                      <div>
                        <dt className="isalwa-section-label">Recibió</dt>
                        <dd className="mt-2 text-[var(--isalwa-kiln)]">{delivery.deliveredTo}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {delivery.notes ? <p className="text-sm text-[var(--isalwa-slate)]">{delivery.notes}</p> : null}
                  <LineList lines={delivery.lines} />
                  {delivery.evidence.length > 0 ? (
                    <ul className="space-y-4" aria-label="Evidencias por actor">
                      {delivery.evidence.map((item) => (
                        <li key={`${item.role}:${item.actorLabel}`} className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{ROLE_LABEL[item.role]}</p>
                            <StatusPill tone="neutral">{item.actorLabel}</StatusPill>
                          </div>
                          {item.reference ? (
                            <p className="mt-2 text-sm text-[var(--isalwa-slate)]">Referencia: {item.reference}</p>
                          ) : null}
                          {item.recipient ? (
                            <p className="mt-2 text-sm text-[var(--isalwa-slate)]">Destinatario: {item.recipient}</p>
                          ) : null}
                          {item.signatureReference ? (
                            <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                              Referencia de evidencia: {item.signatureReference}
                            </p>
                          ) : null}
                          {item.paymentState === 'authorized_exception' ? (
                            <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                              {ENTREGA_PANEL_COPY.exceptionNotPayment}
                            </p>
                          ) : null}
                          {item.note ? <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{item.note}</p> : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
                      {ENTREGA_PANEL_COPY.paymentNotRequired}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PageSection>
    </OpsDeskSurface>
  );
}
