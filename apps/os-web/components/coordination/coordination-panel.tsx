'use client';

import { useState } from 'react';
import { EmptyState, Panel, SectionHeader, StatusPill, Timeline } from '@isalwa/ui';
import { CoordinationDecisionForm } from '@/components/coordination/coordination-decision-form';
import { CoordinationItemCard } from '@/components/coordination/coordination-item-card';
import type { CoordinationPageModel } from '@/lib/coordination/page-model';
import {
  COORDINATION_DECISION_CAPABILITY,
  type CoordinationLedger,
  type RecordedCoordinationDecision,
} from '@isalwa/os-contracts';

export function CoordinationPanel({ model }: { model: CoordinationPageModel }) {
  const [ledger, setLedger] = useState<CoordinationLedger>(model.ledger);
  const session = {
    organizationId: model.organizationId,
    actorMemberId: model.actorMemberId,
    actorLabel: model.actorLabel,
    grantedCapabilities: model.canRecord ? [COORDINATION_DECISION_CAPABILITY] : [],
  };
  const own = ledger.decisions.filter((row) => row.organizationId === model.organizationId);
  const resolvedIds = new Set(
    own.filter((row) => row.kind === 'resolved' && row.resolvesDecisionId).map((row) => row.resolvesDecisionId),
  );
  const openDecisions = own.filter((row) => row.kind === 'recorded' && !resolvedIds.has(row.id));

  function onRecorded(result: RecordedCoordinationDecision) {
    setLedger(result.ledger);
  }

  return (
    <div className="space-y-6">
      <Panel padded>
        <SectionHeader kicker="Comité" title="Asuntos que necesitan una decisión" />
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          No es un calendario de reuniones. Si no hay un asunto que cruce áreas, no hay nada que decidir.
        </p>
        {model.committee.items.length === 0 ? (
          <EmptyState title={model.emptyTitle} description={model.emptyDescription} />
        ) : (
          <div>
            {model.committee.items.map((item) => (
              <CoordinationItemCard
                key={item.id}
                item={item}
                session={session}
                ledger={ledger}
                decisions={own}
                canRecord={model.canRecord}
                onRecorded={onRecorded}
              />
            ))}
          </div>
        )}
      </Panel>

      {own.length > 0 ? (
        <Panel padded>
          <SectionHeader kicker="Historial" title="Decisiones anteriores" />
          <p className="mb-4 text-sm text-[var(--isalwa-slate)]">
            Una decisión anterior permanece hasta que se resuelve. La resolución es una fila nueva.
          </p>
          <Timeline
            items={own.map((row) => ({
              id: row.id,
              label: row.decision,
              meta: row.ownerLabel ?? row.actorLabel,
              body: row.notes,
            }))}
          />
          {model.canRecord
            ? openDecisions.map((row) => (
                <div key={row.id} className="mt-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <StatusPill tone="info">Abierta</StatusPill>
                    <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{row.decision}</p>
                  </div>
                  <CoordinationDecisionForm
                    session={session}
                    ledger={ledger}
                    linkedCaseId={row.linkedCaseId}
                    mode="resolve"
                    resolvesDecisionId={row.id}
                    onRecorded={onRecorded}
                  />
                </div>
              ))
            : null}
        </Panel>
      ) : null}
    </div>
  );
}
