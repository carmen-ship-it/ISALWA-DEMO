import Link from 'next/link';
import { PageSection } from '@isalwa/ui';
import type { TerminationImpactCategoryKey } from '@isalwa/os-contracts';
import type { TerminationImpactResponse } from '@/lib/workforce/types';

type TerminationImpactPanelProps = {
  impact: TerminationImpactResponse;
  memberName: string;
};

const RESOLUTION_HINTS: Partial<
  Record<TerminationImpactCategoryKey, { text: string; hash?: string }>
> = {
  open_work: {
    text: 'Reasigne cada trabajo abierto en',
    hash: 'trabajo-activo',
  },
  direct_reports: {
    text: 'En la ficha de cada reporte, asigne un nuevo responsable en',
    hash: 'continuidad-responsable',
  },
  active_delegations: {
    text: 'Revoca las delegaciones activas con la referencia indicada en',
    hash: 'continuidad-delegaciones',
  },
  pending_approvals: {
    text:
      'Cada aprobación pendiente debe resolverse (aprobar o rechazar) con el aprobador asignado o su delegado. No hay reasignación de aprobador en producto.',
  },
  commercial_accounts: {
    text: 'Reasigne la cuenta comercial desde la ficha del cliente (propietario).',
  },
  open_opportunities: {
    text: 'Reasigne la oportunidad desde su ficha comercial.',
  },
  active_quotes: {
    text: 'Cancele la cotización o espere el comando de reasignación de propietario (aún no disponible).',
  },
  active_orders: {
    text: 'Cierre o cancele el pedido abierto; no hay reasignación de propietario de pedido.',
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
                    {RESOLUTION_HINTS[category.key]!.hash ? (
                      <>
                        {' '}
                        <Link
                          href={`#${RESOLUTION_HINTS[category.key]!.hash}`}
                          className="font-medium text-[var(--isalwa-glaze)] hover:underline"
                        >
                          esta ficha
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
