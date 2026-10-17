import Link from 'next/link';
import { PageSection } from '@isalwa/ui';
import type { TerminationImpactCategoryKey } from '@isalwa/os-contracts';
import { LIFECYCLE_ENDED_CATEGORY_KEYS, UNRESOLVED_OWNERSHIP_MESSAGE } from '@isalwa/os-contracts';
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
      'No hay reasignación de cotizaciones en el producto: la cotización sigue a nombre de esta persona hasta que se cancele o se cambie el responsable de la cuenta. Abra la cotización desde',
    hash: 'continuidad-comercial',
    linkLabel: 'Continuidad comercial',
  },
  active_orders: {
    text:
      'No hay reasignación de pedidos en el producto: el pedido sigue a nombre de esta persona y se atiende con los comandos del pedido. Abra el pedido desde',
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
    text:
      'No impide suspender ni finalizar el acceso: las delegaciones otorgadas o recibidas terminan en ese momento y quedan en el historial. Detalle en',
    hash: 'continuidad-delegaciones',
    linkLabel: 'Delegaciones',
  },
  primary_customer_coverage: {
    text:
      'No impide suspender ni finalizar el acceso: la cobertura que esta persona otorgó termina en ese momento y queda en el historial. Esos clientes quedan registrados como pendientes de asignar hasta que quien administra la cartera los reasigne. Enlaces en',
    hash: 'continuidad-comercial',
    linkLabel: 'Continuidad comercial',
  },
  acting_customer_coverage: {
    text:
      'No impide suspender ni finalizar el acceso: la cobertura temporal termina en ese momento (también la programada) y el cliente vuelve a su responsable principal si sigue activo; si no, queda pendiente de asignar. Al reactivar a la persona no se restablece: hace falta un nuevo apoyo autorizado. Enlaces en',
    hash: 'continuidad-comercial',
    linkLabel: 'Continuidad comercial',
  },
};

const ENDED_BY_LIFECYCLE = new Set<string>(LIFECYCLE_ENDED_CATEGORY_KEYS);

/**
 * Continuity summary for the member: what they still own, kept for reassignment. Nothing
 * here blocks suspension or termination (23:47 §B2).
 * Spanish labels only — no event keys or command names.
 */
export function TerminationImpactPanel({ impact, memberName }: TerminationImpactPanelProps) {
  const shown = impact.categories.filter((c) => c.count > 0);

  return (
    <PageSection card className="p-8" id="responsabilidades">
      <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Responsabilidades</h2>
      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
        Lo que {memberName} todavía tiene a su cargo y requiere una persona responsable.
      </p>

      {shown.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--isalwa-slate)]">
          No hay responsabilidades pendientes de reasignar.
        </p>
      ) : (
        <>
          {impact.unresolvedCount > 0 ? (
            <p className="mt-6 text-sm font-medium text-[var(--isalwa-kiln)]" data-unresolved-ownership="visible">
              {UNRESOLVED_OWNERSHIP_MESSAGE}
            </p>
          ) : null}
          <ul className="mt-4 space-y-4">
            {shown.map((category) => (
              <li key={category.key} className="border-t border-[var(--isalwa-mist)] pt-4">
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                  {category.label}
                  <span className="ml-2 tabular-nums text-[var(--isalwa-slate)]">{category.count}</span>
                  {ENDED_BY_LIFECYCLE.has(category.key) ? (
                    <span className="ml-2 text-[var(--isalwa-slate)]">· termina con la suspensión o finalización</span>
                  ) : null}
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
