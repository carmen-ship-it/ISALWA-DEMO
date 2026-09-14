import Link from 'next/link';
import { InsightCard, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import type { PedidoOperatingView } from '@/lib/operations/pedido-case';

const linkClass =
  'isalwa-t-fast font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="isalwa-section-label">{label}</dt>
      <dd className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">{value}</dd>
    </div>
  );
}

/**
 * Few fields at the top of a Pedido. Further facts stay behind disclosure and capability.
 */
export function PedidoOperatingSummary({ view }: { view: PedidoOperatingView }) {
  if (!view.sections.summary) return null;

  return (
    <PageSection card className="bg-white p-8 md:p-10" aria-label="Resumen del pedido">
      <SectionHeader
        kicker="Pedido"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            {view.what}
          </h2>
        }
        action={<StatusPill tone="neutral">{view.statusLabel}</StatusPill>}
      />

      <dl className="mt-8 grid gap-8 sm:grid-cols-2">
        <Field label="Qué es" value={view.what} />
        <div>
          <dt className="isalwa-section-label">Quién lo posee</dt>
          <dd className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
            {view.owner.primaryLabel}
            {view.owner.actingAdvisorLabel ? (
              <span className="mt-1 block text-[var(--isalwa-slate)]">
                Cubre: {view.owner.actingAdvisorLabel}
              </span>
            ) : null}
          </dd>
        </div>
        <Field label={view.customerDate.label} value={view.customerDate.value} />
        <Field label={view.productionDate.label} value={view.productionDate.value} />
        <div>
          <dt className="isalwa-section-label">Clasificación</dt>
          <dd className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill tone={view.classificationLabel === 'Pedido especial' ? 'warning' : 'neutral'}>
              {view.classificationLabel}
            </StatusPill>
            {view.planningLabel ? <StatusPill tone="info">{view.planningLabel}</StatusPill> : null}
          </dd>
        </div>
        <Field label="Cliente informado" value={view.customerInformed} />
        <Field label="Siguiente acción" value={view.nextAction} />
        <Field label="Función responsable" value={view.responsibleFunction} />
        <Field
          label="Último cambio"
          value={view.latestChange.at ? `${view.latestChange.label} · ${view.latestChange.at}` : view.latestChange.label}
        />
      </dl>

      {view.blocker ? (
        <InsightCard className="mt-8">
          <span className="not-italic text-sm font-medium">Bloqueo</span>
          <span className="mt-1 block">{view.blocker}</span>
        </InsightCard>
      ) : null}

      <p className="mt-8 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{view.owner.note}</p>
      {view.fulfillment.recorded === false ? (
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {view.fulfillment.message}
        </p>
      ) : null}
      {view.listo ? (
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{view.listo.message}</p>
      ) : null}

      {view.sections.release || view.sections.allocation || view.laneLinks.length > 0 ? (
        <details className="mt-8 border-t border-[var(--isalwa-mist)] pt-6">
          <summary className="cursor-pointer text-sm font-medium text-[var(--isalwa-kiln)]">
            Más sobre este pedido
          </summary>
          <div className="mt-6 grid gap-6">
            {view.sections.release ? (
              <div>
                <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{view.paymentNotRequired}</p>
                {view.release ? (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
                    {view.release.title}. {view.release.boundary}
                  </p>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">{view.exceptionNote}</p>
                {view.sections.exceptionAuthorize ? (
                  <p className="mt-2 text-sm text-[var(--isalwa-kiln)]">
                    Puede autorizar una excepción. Eso no confirma el pago.
                  </p>
                ) : null}
              </div>
            ) : null}
            {view.sections.allocation && view.fulfillment.recorded ? (
              <ul className="grid gap-3" aria-label="Asignación registrada">
                {view.fulfillment.items.map((item) => (
                  <li key={item.label} className="text-sm text-[var(--isalwa-kiln)]">
                    {item.label}: {item.allocatedQuantity}
                    {item.deliveredQuantity ? ` · entrega registrada ${item.deliveredQuantity}` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
            {view.laneLinks.length > 0 ? (
              <ul className="flex flex-wrap gap-4">
                {view.laneLinks.map((lane) => (
                  <li key={lane.href}>
                    <Link href={lane.href} className={linkClass}>
                      {lane.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </details>
      ) : null}
    </PageSection>
  );
}
