import { EmptyState, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';

/**
 * Presentational Entrega panel. Not mounted.
 * CROSS_LANE: mount from apps/os-web/app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx
 * only after that shared order page is free. Do not invent a number there.
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

export type EntregaPanelProps = {
  warehouseExits: Array<{
    exitedAt: string;
    recordedByLabel: string;
    notes: string | null;
    lines: EntregaLineView[];
  }>;
  deliveries: Array<{
    deliveredAt: string;
    deliveredTo: string | null;
    recordedByLabel: string;
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
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Sin líneas. El pedido no tiene cantidades conocidas para copiar.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Cantidades conocidas">
      {lines.map((line) => (
        <li key={`${line.description}:${line.quantity}`} className="flex items-baseline justify-between gap-4 py-3 text-sm">
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

export function EntregaPanel({ warehouseExits, deliveries }: EntregaPanelProps) {
  return (
    <div className="space-y-10" data-entrega-boundary={deliveries.length > 0 ? 'delivered' : 'before-delivery'}>
      <PageSection card className="bg-white p-8 md:p-10">
        <SectionHeader
          kicker="Entrega"
          title={
            <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
              Nota de salida de almacén
            </h2>
          }
          action={<StatusPill tone="info">No es entrega</StatusPill>}
        />
        <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          La nota de salida registra que la mercadería salió del almacén. No es la nota de entrega.
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          No se asigna un número. La política de numeración no está definida.
        </p>
        {warehouseExits.length === 0 ? (
          <EmptyState
            className="mt-8"
            title="Todavía no hay salida de almacén"
            description="Una salida de almacén no crea la nota de entrega."
          />
        ) : (
          <ul className="mt-8 space-y-8" aria-label="Salidas de almacén">
            {warehouseExits.map((exit) => (
              <li key={exit.exitedAt} className="space-y-4">
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
                </dl>
                {exit.notes ? <p className="text-sm text-[var(--isalwa-slate)]">{exit.notes}</p> : null}
                <LineList lines={exit.lines} />
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      <PageSection card className="bg-white p-8 md:p-10">
        <SectionHeader
          kicker="Entrega"
          title={
            <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
              Nota de entrega
            </h2>
          }
        />
        <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          La nota de entrega se crea solo cuando la mercadería llega al cliente final.
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          Un pedido no la emite. Una salida de almacén tampoco.
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          La nota de entrega no puede ser anterior a la entrega.
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          No se asigna un número. La política de numeración no está definida.
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          No es una factura y no calcula impuesto.
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          El pago no es requisito para registrar la entrega.
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          Una excepción autorizada no es un pago confirmado en el libro.
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          La coordinación, el pago, la salida de almacén y la confirmación de entrega son evidencias distintas. No se mezclan en un solo actor.
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          No hay un método de firma. Solo se puede anotar una referencia de evidencia.
        </p>

        {deliveries.length === 0 ? (
          <EmptyState
            className="mt-8"
            title="Todavía no hay una entrega registrada."
            description="La nota de entrega se crea solo cuando la mercadería llega al cliente final."
          />
        ) : (
          <ul className="mt-8 space-y-10" aria-label="Entregas al cliente">
            {deliveries.map((delivery) => {
              const payment = delivery.evidence.find((item) => item.role === 'accounting_payment') ?? null;
              return (
                <li key={delivery.deliveredAt} className="space-y-6">
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
                  <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-kiln)]">
                    Entrega registrada. La nota existe porque la mercadería llegó al cliente final.
                  </p>
                  <dl className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <dt className="isalwa-section-label">Entregada</dt>
                      <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatWhen(delivery.deliveredAt)}</dd>
                    </div>
                    <div>
                      <dt className="isalwa-section-label">Registró</dt>
                      <dd className="mt-2 text-[var(--isalwa-kiln)]">{delivery.recordedByLabel}</dd>
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
                              Una excepción autorizada no es un pago confirmado en el libro.
                            </p>
                          ) : null}
                          {item.note ? <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{item.note}</p> : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
                      El pago no es requisito para registrar la entrega.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PageSection>
    </div>
  );
}
