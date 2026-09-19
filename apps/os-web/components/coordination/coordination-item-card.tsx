'use client';

import { StatusPill, Timeline } from '@isalwa/ui';
import { CoordinationFieldList } from '@/components/coordination/coordination-fields';
import {
  COORDINATION_TRIGGER_LABELS,
  type CoordinationCommitteeItem,
  type CoordinationDecisionRecord,
  type CoordinationLedger,
  type CoordinationSession,
  type RecordedCoordinationDecision,
} from '@isalwa/os-contracts';

type CoordinationItemCardProps = {
  item: CoordinationCommitteeItem;
  session: CoordinationSession;
  ledger: CoordinationLedger;
  decisions: readonly CoordinationDecisionRecord[];
  canRecord: boolean;
  onRecorded: (result: RecordedCoordinationDecision) => void;
};

export function CoordinationItemCard({
  item,
  decisions,
  canRecord,
}: CoordinationItemCardProps) {
  const linked = item.linkedCaseId
    ? decisions.filter(
        (row) => row.organizationId === item.organizationId && row.linkedCaseId === item.linkedCaseId,
      )
    : [];

  return (
    <article className="space-y-4 border-t border-[var(--isalwa-mist)] py-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap gap-2">
        {item.triggers.map((trigger) => (
          <StatusPill key={trigger} tone="warning">
            {COORDINATION_TRIGGER_LABELS[trigger]}
          </StatusPill>
        ))}
      </div>
      <CoordinationFieldList values={item} />
      {linked.length > 0 ? (
        <Timeline
          items={linked.map((row) => ({
            id: row.id,
            label: row.kind === 'resolved' ? 'Resolución' : 'Decisión',
            meta: row.actorLabel,
            body: row.decision,
          }))}
        />
      ) : null}
      {canRecord ? (
        <p className="text-sm text-[var(--isalwa-slate)]">
          Coordinación aún no registra decisiones operativas de forma persistente.
        </p>
      ) : (
        <p className="text-sm text-[var(--isalwa-slate)]">
          Registrar una decisión exige la capacidad asignada. El cargo no la otorga.
        </p>
      )}
    </article>
  );
}
