'use client';

import { useState } from 'react';
import { StatusPill } from '@isalwa/ui';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
import {
  CORRECTION_COPY,
  MANUAL_DATA_HEADING,
  MANUAL_OPERATIONS_INTRO,
  REPORTED_FACT_NOT_PERSISTED_COPY,
  linkCorrection,
  type ReportedFactWriteResult,
  type ReportedOperationalFact,
} from '@/lib/operations/reported-fact';
import { InventorySnapshotForm } from './inventory-snapshot-form';
import { ManualDispatchForm } from './manual-dispatch-form';
import { ManualPaymentForm } from './manual-payment-form';
import { ReportedFactProvenance } from './reported-fact-provenance';
import type { ManualOperationSubject } from './subject';

type ManualOperationsPanelProps = ManualOperationSubject;

/**
 * Local draft only. Does not persist and does not mutate commercial records.
 * Mount from the customer or quote surface; this panel does not look up customers.
 */
export function ManualOperationsPanel(props: ManualOperationsPanelProps) {
  const [facts, setFacts] = useState<ReportedOperationalFact[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [correctsFactId, setCorrectsFactId] = useState<string | null>(null);

  function onRecorded(result: ReportedFactWriteResult) {
    const fact = correctsFactId ? linkCorrection(result.fact, correctsFactId) : result.fact;
    setCorrectsFactId(null);
    setFacts((current) => [fact, ...current]);
    setNotice(result.notice);
  }

  function onReversed(fact: ReportedOperationalFact) {
    setFacts((current) => current.map((item) => (item.id === fact.id ? fact : item)));
    setCorrectsFactId(fact.id);
    setNotice(REPORTED_FACT_NOT_PERSISTED_COPY);
  }

  return (
    <section aria-label={MANUAL_DATA_HEADING} className="max-w-xl space-y-4" data-tour={TOUR_TARGET.manualDraft}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-medium text-[var(--isalwa-kiln)]">{MANUAL_DATA_HEADING}</h2>
        <StatusPill tone="manual">Dato manual</StatusPill>
        <StatusPill tone="warning">No guardado</StatusPill>
      </div>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{MANUAL_OPERATIONS_INTRO}</p>
      {correctsFactId ? (
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{CORRECTION_COPY.nextLinks}</p>
      ) : null}
      {notice ? (
        <p className="text-sm leading-relaxed text-[var(--isalwa-kiln)]" role="status">
          {notice}
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{REPORTED_FACT_NOT_PERSISTED_COPY}</p>
      )}
      {facts.map((fact) => (
        <ReportedFactProvenance
          key={`${fact.id}:${fact.activity}`}
          fact={fact}
          onReversed={onReversed}
        />
      ))}
      <ManualPaymentForm {...props} onRecorded={onRecorded} />
      <ManualDispatchForm {...props} onRecorded={onRecorded} />
      <InventorySnapshotForm {...props} onRecorded={onRecorded} />
    </section>
  );
}
