/**
 * Entrega panel. Mounted on /entregas.
 * Warehouse exit and customer delivery stay in separate sections.
 * Nota de entrega is a separate operational document (not shown as delivery).
 */

import { ENTREGA_PANEL_COPY } from '@isalwa/os-contracts';
import { EmptyState, PageSection, SectionHeader, Skeleton, StatusPill } from '@isalwa/ui';
import { OpsDeskSurface } from '@/components/production/ops-desk-surface';
import { presentEntregaAuditLabel } from '@/lib/delivery/display-labels';
import { boundHistoryItems } from '@/lib/lists/ops-collection';

export type EntregaLineView = {
  description: string;
  quantity: number;
  unitLabel: string | null;
};

export type EntregaEvidenceView = {
  role:
    | 'commercial_coordination'
    | 'accounting_payment'
    | 'warehouse_outbound'
    | 'delivery_confirmation';
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
    orderId?: string | null;
    exitedAt: string;
    recordedByLabel: string;
    sourceLabel?: string;
    notes: string | null;
    lines: EntregaLineView[];
  }>;
  deliveries: Array<{
    id?: string;
    orderId?: string | null;
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
  warehouse_outbound: 'Salida de almacén',
  delivery_confirmation: 'Confirmación de entrega',
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

function LineList({ lines }: { lines: EntregaLineView[] }) {
  if (lines.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Sin líneas. El pedido no tiene cantidades conocidas para copiar.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Cantidades conocidas">
      {lines.map((line, index) => (
        <li
          key={`${line.description}:${line.quantity}:${index}`}
          className="flex items-baseline justify-between gap-4 py-3 text-sm"
        >
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

export function EntregaPanel({ status = 'ready', warehouseExits, deliveries }: EntregaPanelProps) {
  const surface =
    status === 'ready' && warehouseExits.length === 0 && deliveries.length === 0 ? 'empty' : status;
  const exitWindow = boundHistoryItems(
    [...warehouseExits].sort((left, right) => right.exitedAt.localeCompare(left.exitedAt)),
  );
  const deliveryWindow = boundHistoryItems(
    [...deliveries].sort((left, right) => right.deliveredAt.localeCompare(left.deliveredAt)),
  );

  if (surface === 'loading') {
    return (
      <div
        className="space-y-6"
        data-entrega-boundary="loading"
        aria-busy="true"
        aria-live="polite"
      >
        <p className="text-sm text-[var(--isalwa-slate)]">Cargando el registro de entrega.</p>
        <Skeleton h={18} rounded="pill" />
        <Skeleton h={96} rounded="panel" />
      </div>
    );
  }

  if (surface === 'error') {
    return (
      <div data-entrega-boundary="error">
        <EmptyState
          title="No se pudo cargar el registro de entrega."
          description="Este es un registro interno de entrega. No reclama un número oficial."
        />
      </div>
    );
  }

  if (surface === 'permission') {
    return (
      <div data-entrega-boundary="permission" role="alert" data-owner-review-state="not-authorized">
        <EmptyState
          title="No tiene permiso para ver este registro de entrega."
          description="Este es un registro interno de entrega. No reclama un número oficial."
          example="Con el permiso de entregas en la sesión, verá salidas y notas internas de esta empresa."
        />
      </div>
    );
  }

  return (
    <OpsDeskSurface
      className="space-y-10"
      data-entrega-boundary={deliveries.length > 0 ? 'delivered' : 'before-delivery'}
    >
      {warehouseExits.length === 0 && deliveries.length === 0 ? (
        <div data-owner-review-state="no-data">
          <EmptyState
            title="Todavía no hay salidas ni entregas registradas"
            description="La empresa aún no tiene salidas de almacén ni entregas al cliente guardadas."
            example="Cuando exista un registro formalizado de salida o entrega, aparecerá en el historial."
          />
        </div>
      ) : null}

      <PageSection
        id="entregas-salidas"
        card
        className="scroll-mt-[calc(var(--isalwa-entrega-sticky-nav-offset,2.75rem)+0.5rem)] border-l-4 border-l-[var(--isalwa-kiln)] p-6 md:p-8"
      >
        <SectionHeader
          kicker="Salida"
          title={
            <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
              Salidas
            </h2>
          }
          action={<StatusPill tone="info">No es entrega</StatusPill>}
        />
        <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          Mercadería que salió del almacén. Distinto de la nota de entrega y de la entrega al
          cliente.
        </p>
        {warehouseExits.length === 0 ? (
          <div data-owner-review-state="no-data" className="mt-8">
            <EmptyState
              title="Todavía no hay salida de almacén"
              description="Una salida de almacén no crea la nota de entrega ni la entrega al cliente."
              example="El registro definitivo de salida se formalizará después de validar el flujo con la empresa."
            />
          </div>
        ) : (
          <ul className="mt-6 space-y-3" aria-label="Salidas de almacén">
            {exitWindow.items.map((exit) => (
              <li
                key={exit.id ?? exit.exitedAt}
                className="space-y-2 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] border-l-4 border-l-[var(--isalwa-kiln)] p-3 md:p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{formatWhen(exit.exitedAt)}</p>
                  <StatusPill tone="info" icon="none">No es entrega</StatusPill>
                </div>
                <p className="text-sm text-[var(--isalwa-slate)]">
                  Registró {presentEntregaAuditLabel(exit.recordedByLabel)}
                </p>
                <details>
                  <summary className="cursor-pointer list-none text-xs font-medium text-[var(--isalwa-slate)] [&::-webkit-details-marker]:hidden">
                    Origen y detalle
                  </summary>
                  <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                    Origen: {presentEntregaAuditLabel(exit.sourceLabel ?? 'Registro interno')}
                  </p>
                  {exit.notes ? (
                    <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{exit.notes}</p>
                  ) : null}
                </details>
                <LineList lines={exit.lines} />
              </li>
            ))}
          </ul>
        )}
        {exitWindow.truncated ? (
          <p className="mt-4 text-sm text-[var(--isalwa-slate)]" role="status">
            Mostrando las 25 salidas más recientes de esta vista.
          </p>
        ) : null}
      </PageSection>

      <PageSection
        id="entregas-entregas"
        card
        className="scroll-mt-[calc(var(--isalwa-entrega-sticky-nav-offset,2.75rem)+0.5rem)] border-l-4 border-l-[var(--isalwa-success)] bg-[color-mix(in_srgb,var(--isalwa-status-green-bg)_55%,white)] p-6 md:p-8"
      >
        <SectionHeader
          kicker="Entrega"
          title={
            <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
              Entregas
            </h2>
          }
        />
        <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          Entrega al cliente registrada. Requiere salida previa y «Recibido por». Distinta de la
          nota de entrega.
        </p>
        {deliveries.length === 0 ? (
          <div data-owner-review-state="no-data" className="mt-8">
            <EmptyState
              title={ENTREGA_PANEL_COPY.noDeliveryYet}
              description="La entrega no se infiere de la nota ni de la salida. Un vacío no inventa llegada."
              example="Registre la entrega desde el pedido cuando la salida exista y conozca quién recibió."
            />
          </div>
        ) : (
          <ul className="mt-8 space-y-6" aria-label="Entregas al cliente">
            {deliveryWindow.items.map((delivery) => {
              const payment =
                delivery.evidence.find((item) => item.role === 'accounting_payment') ?? null;
              return (
                <li
                  key={delivery.id ?? delivery.deliveredAt}
                  className="space-y-4 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] p-4"
                >
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone="success">Entregada</StatusPill>
                    {payment?.paymentState === 'authorized_exception' ? (
                      <StatusPill tone="warning">Excepción. No es un pago confirmado</StatusPill>
                    ) : null}
                  </div>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="isalwa-section-label">Entregada</dt>
                      <dd className="mt-1.5 text-[var(--isalwa-kiln)]">
                        {formatWhen(delivery.deliveredAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="isalwa-section-label">Registró</dt>
                      <dd className="mt-1.5 text-[var(--isalwa-kiln)]">
                        {presentEntregaAuditLabel(delivery.recordedByLabel)}
                      </dd>
                    </div>
                    <div>
                      <dt className="isalwa-section-label">Recibido por</dt>
                      <dd className="mt-1.5 text-[var(--isalwa-kiln)]" data-recibido-por="">
                        {delivery.deliveredTo?.trim() || 'No registrado'}
                      </dd>
                    </div>
                  </dl>
                  {delivery.notes ? (
                    <p className="text-sm text-[var(--isalwa-slate)]">{delivery.notes}</p>
                  ) : null}
                  <LineList lines={delivery.lines} />
                  {delivery.evidence.length > 0 ? (
                    <details>
                      <summary className="cursor-pointer list-none text-xs font-medium text-[var(--isalwa-slate)] [&::-webkit-details-marker]:hidden">
                        Evidencias
                      </summary>
                      <ul className="mt-3 space-y-3" aria-label="Evidencias por actor">
                        {delivery.evidence.map((item) => (
                          <li
                            key={`${item.role}:${item.actorLabel}`}
                            className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                                {ROLE_LABEL[item.role]}
                              </p>
                              <StatusPill tone="neutral">
                                {presentEntregaAuditLabel(item.actorLabel)}
                              </StatusPill>
                            </div>
                            {item.reference ? (
                              <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                                Referencia: {item.reference}
                              </p>
                            ) : null}
                            {item.recipient ? (
                              <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                                Destinatario: {item.recipient}
                              </p>
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
                            {item.note ? (
                              <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{item.note}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {deliveryWindow.truncated ? (
          <p className="mt-4 text-sm text-[var(--isalwa-slate)]" role="status">
            Mostrando las 25 entregas más recientes de esta vista.
          </p>
        ) : null}
      </PageSection>
    </OpsDeskSurface>
  );
}
