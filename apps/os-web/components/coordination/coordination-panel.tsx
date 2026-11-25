'use client';

import { EmptyState, Panel, SectionHeader, StatusPill, Timeline } from '@isalwa/ui';
import { CoordinationItemCard } from '@/components/coordination/coordination-item-card';
import { CoordinationDecisionForm } from '@/components/coordination/coordination-decision-form';
import { OpsDeskSurface } from '@/components/production/ops-desk-surface';
import type { CoordinationPageModel } from '@/lib/coordination/page-model';
import { formatTimestamp } from '@/lib/commercial/labels';

export function CoordinationPanel({ model }: { model: CoordinationPageModel }) {
  const own = model.ledger.decisions.filter((row) => row.organizationId === model.organizationId);
  const resolvedIds = new Set(
    own.filter((row) => row.kind === 'resolved' && row.resolvesDecisionId).map((row) => row.resolvesDecisionId),
  );
  const openDecisions = own.filter((row) => row.kind === 'recorded' && !resolvedIds.has(row.id));

  return (
    <OpsDeskSurface className="space-y-6">
      <Panel padded>
        <SectionHeader
          kicker="Comité"
          title="Asuntos que necesitan una decisión"
          action={
            openDecisions.length > 0 ? (
              <StatusPill tone="warning">
                {openDecisions.length === 1 ? '1 abierta' : `${openDecisions.length} abiertas`}
              </StatusPill>
            ) : (
              <StatusPill tone="neutral">Sin abiertas</StatusPill>
            )
          }
        />
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          Las decisiones se guardan en la organización. No se inventan asuntos de comité ni se
          toca producción o pagos desde aquí.
        </p>
        {model.committee.items.length === 0 ? (
          <EmptyState
            title={model.emptyTitle}
            description={model.emptyDescription}
            example="Cuando un caso cruce áreas y necesite decisión, aparecerá aquí. No se inventan asuntos de comité."
          />
        ) : (
          <div>
            {model.committee.items.map((item) => (
              <CoordinationItemCard
                key={item.id}
                item={item}
                decisions={own}
                canRecord={model.canRecord}
              />
            ))}
          </div>
        )}
        {model.canRecord ? (
          <div className="mt-6">
            <SectionHeader kicker="Registro" title="Registrar decisión" />
            <CoordinationDecisionForm linkedCaseId={null} mode="record" />
          </div>
        ) : (
          <p className="mt-6 text-sm text-[var(--isalwa-slate)]">
            Registrar una decisión exige la capacidad asignada. El cargo no la otorga.
          </p>
        )}
      </Panel>

      {own.length > 0 ? (
        <Panel padded>
          <SectionHeader kicker="Historial" title="Decisiones anteriores" />
          <Timeline
            items={own.map((row) => ({
              id: row.id,
              label: row.decision,
              meta: (
                <span className="text-sm text-[var(--isalwa-slate)]">
                  {row.kind === 'resolved' ? 'Resuelta' : 'Abierta'}
                  {' · '}
                  {row.ownerLabel ?? row.actorLabel}
                  {row.occurredAt ? ` · ${formatTimestamp(row.occurredAt) ?? row.occurredAt}` : ''}
                </span>
              ),
              body: row.notes,
            }))}
          />
          {model.canRecord && openDecisions[0] ? (
            <div className="mt-6">
              <SectionHeader kicker="Cierre" title="Registrar resolución" />
              <CoordinationDecisionForm
                linkedCaseId={openDecisions[0].linkedCaseId}
                mode="resolve"
                resolvesDecisionId={openDecisions[0].id}
              />
            </div>
          ) : null}
        </Panel>
      ) : null}
    </OpsDeskSurface>
  );
}
