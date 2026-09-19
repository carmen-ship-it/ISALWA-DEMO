import Link from 'next/link';
import { PageSection } from '@isalwa/ui';
import type { TerminationImpactCategoryKey } from '@isalwa/os-contracts';
import { SUSPEND_BLOCKED_MESSAGE, hasSuspendActionableWork } from '@isalwa/os-contracts';
import type { TerminationImpactResponse } from '@/lib/workforce/types';

type TerminationImpactPanelProps = {
  impact: TerminationImpactResponse;
  memberName: string;
};

const RESOLUTION_HINTS: Partial<
  Record<
    TerminationImpactCategoryKey,
    { text: string; hash?: string; href?: string; linkLabel?: string }
  >
> = {
  open_work: {
    text: 'Puede reasignar el trabajo abierto desde',
    hash: 'trabajo-activo',
    linkLabel: 'Trabajo activo',
  },
  open_opportunities: {
    text: 'Puede reasignar las oportunidades abiertas desde',
    hash: 'continuidad-comercial',
    linkLabel: 'Continuidad comercial',
  },
  commercial_accounts: {
    text:
      'El cambio de responsable de la cuenta se hace en la ficha del cliente y requiere un permiso comercial distinto. Si usted no puede cambiarlo, pida a quien administra cuentas que reasigne el propietario. Enlaces en',
    hash: 'continuidad-comercial',
    linkLabel: 'Continuidad comercial',
  },
  active_quotes: {
    text:
      'No hay reasignación de cotizaciones en el producto. Mientras la cotización no esté cancelada, no se puede finalizar el acceso. Abra la cotización desde',
    hash: 'continuidad-comercial',
    linkLabel: 'Continuidad comercial',
  },
  active_orders: {
    text:
      'No hay reasignación de pedidos en el producto. Mientras el pedido siga abierto, no se puede finalizar el acceso. Abra el pedido desde',
    hash: 'continuidad-comercial',
    linkLabel: 'Continuidad comercial',
  },
  pending_approvals: {
    text:
      'Cada aprobación pendiente debe resolverse (aprobar o rechazar) por el aprobador asignado o su delegado. No se puede reasignar el aprobador desde aquí. Revise',
    href: '/aprobaciones',
    linkLabel: 'Aprobaciones',
  },
  direct_reports: {
    text: 'Asigne un nuevo responsable a cada reporte desde',
    hash: 'continuidad-responsable',
    linkLabel: 'Organización',
  },
  active_delegations: {
    text: 'Revoca las delegaciones activas (otorgadas o recibidas) en',
    hash: 'continuidad-delegaciones',
    linkLabel: 'Delegaciones',
  },
  primary_customer_coverage: {
    text:
      'No hay reasignación de cobertura de clientes en el producto. Mientras esta persona siga como responsable principal de un cliente, no se puede finalizar el acceso. Eso requiere quien administra la cobertura comercial — no se concede desde administración de personas. Enlaces en',
    hash: 'continuidad-comercial',
    linkLabel: 'Continuidad comercial',
  },
  acting_customer_coverage: {
    text:
      'No hay revocación de cobertura temporal en pantalla. Mientras la cobertura temporal siga activa, no se puede finalizar el acceso. Pida a quien administra la cobertura comercial que la finalice. Enlaces en',
    hash: 'continuidad-comercial',
    linkLabel: 'Continuidad comercial',
  },
};

/**
 * Read-only continuity summary before Finalizar acceso.
 * Spanish labels only — no event keys or command names.
 */
export function TerminationImpactPanel({ impact, memberName }: TerminationImpactPanelProps) {
  const blocking = impact.categories.filter((c) => c.count > 0);

  return (
    <PageSection card className="p-8" id="responsabilidades">
      <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Responsabilidades</h2>
      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
        Antes de finalizar el acceso de {memberName}, revise lo que todavía requiere una persona
        responsable.
      </p>
      {hasSuspendActionableWork(impact.categories) ? (
        <p className="mt-4 text-sm font-medium text-[var(--isalwa-kiln)]" data-suspend-impact="visible">
          {SUSPEND_BLOCKED_MESSAGE}
        </p>
      ) : null}

      {impact.canTerminate ? (
        <p className="mt-6 text-sm text-[var(--isalwa-slate)]">
          No hay responsabilidades activas que bloqueen la finalización.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm font-medium text-[var(--isalwa-kiln)]">
            No puedes finalizar este acceso todavía. Esta persona todavía tiene responsabilidades
            activas que deben reasignarse.
          </p>
          <ul className="mt-4 space-y-4">
            {blocking.map((category) => (
              <li key={category.key} className="border-t border-[var(--isalwa-mist)] pt-4">
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                  {category.label}
                  <span className="ml-2 tabular-nums text-[var(--isalwa-slate)]">{category.count}</span>
                </p>
                {category.items.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-[var(--isalwa-slate)]">
                    {category.items.slice(0, 8).map((item) => (
                      <li key={item.id}>{item.summary}</li>
                    ))}
                    {category.items.length > 8 ? (
                      <li>…y {category.items.length - 8} más</li>
                    ) : null}
                  </ul>
                ) : null}
                {category.foundationGaps && category.foundationGaps.length > 0 ? (
                  <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                    Parte de esta categoría aún no tiene reasignación en pantalla. Reasigne por
                    los caminos disponibles o espere la continuidad comercial completa.
                  </p>
                ) : null}
                {RESOLUTION_HINTS[category.key] ? (
                  <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                    {RESOLUTION_HINTS[category.key]!.text}
                    {RESOLUTION_HINTS[category.key]!.hash || RESOLUTION_HINTS[category.key]!.href ? (
                      <>
                        {' '}
                        <Link
                          href={
                            RESOLUTION_HINTS[category.key]!.href ??
                            `#${RESOLUTION_HINTS[category.key]!.hash}`
                          }
                          className="font-medium text-[var(--isalwa-glaze)] hover:underline"
                        >
                          {RESOLUTION_HINTS[category.key]!.linkLabel ?? 'esta ficha'}
                        </Link>
                        .
                      </>
                    ) : (
                      '.'
                    )}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </PageSection>
  );
}
