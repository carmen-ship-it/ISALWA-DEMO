'use client';

import { useMemo, useState } from 'react';
import { EmptyState, PageSection, StatusPill } from '@isalwa/ui';
import { ManualPaymentForm } from '@/components/operations/manual-payment-form';
import { ReportedFactProvenance } from '@/components/operations/reported-fact-provenance';
import {
  FINANCE_DESK_COPY,
  authorizeFinanceOperationalWrite,
  type FinanceActorSession,
  type FinanceDeskDenial,
  financePermissionCopy,
} from '@/lib/finance';
import {
  REPORTED_FACT_NOT_PERSISTED_COPY,
  linkCorrection,
  type ReportedFactWriteResult,
  type ReportedOperationalFact,
} from '@/lib/operations/reported-fact';

type FinanceOperationalDeskProps =
  | {
      status: 'denied';
      reason: FinanceDeskDenial;
    }
  | {
      status: 'ready';
      organizationId: string;
      memberId: string;
      actorLabel: string;
      grantedScopes: readonly string[];
    };

type SubjectType = 'party' | 'order' | 'quote';

/**
 * Contabilidad operational desk. Manual/reported payment evidence only.
 * Not a ledger. Not Ingresos. Not official accounting.
 */
export function FinanceOperationalDesk(props: FinanceOperationalDeskProps) {
  if (props.status === 'denied') {
    const copy = financePermissionCopy(props.reason);
    return (
      <div data-finance-status="denied" role="alert" className="max-w-2xl">
        <EmptyState title={copy.title} description={copy.description} />
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {FINANCE_DESK_COPY.boundaryOfficial}
        </p>
      </div>
    );
  }

  return (
    <ReadyDesk
      organizationId={props.organizationId}
      memberId={props.memberId}
      actorLabel={props.actorLabel}
      grantedScopes={props.grantedScopes}
    />
  );
}

function ReadyDesk(props: {
  organizationId: string;
  memberId: string;
  actorLabel: string;
  grantedScopes: readonly string[];
}) {
  const session: FinanceActorSession = useMemo(
    () => ({
      organizationId: props.organizationId,
      memberId: props.memberId,
      accessStatus: 'active',
      actorLabel: props.actorLabel,
      grantedScopes: props.grantedScopes,
    }),
    [props.organizationId, props.memberId, props.actorLabel, props.grantedScopes],
  );

  const [subjectType, setSubjectType] = useState<SubjectType>('order');
  const [subjectId, setSubjectId] = useState('');
  const [subjectLabel, setSubjectLabel] = useState('');
  const [facts, setFacts] = useState<ReportedOperationalFact[]>([]);
  const [correctsFactId, setCorrectsFactId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  const trimmedSubjectId = subjectId.trim();
  const canShowForm = trimmedSubjectId.length > 0;

  function onRecorded(result: ReportedFactWriteResult) {
    const auth = authorizeFinanceOperationalWrite({
      session,
      organizationId: result.fact.organizationId,
    });
    if (!auth.ok) {
      setWriteError(financePermissionCopy(auth.reason).description);
      return;
    }
    const fact = correctsFactId ? linkCorrection(result.fact, correctsFactId) : result.fact;
    setCorrectsFactId(null);
    setFacts((current) => [fact, ...current]);
    setNotice(result.notice);
    setWriteError(null);
  }

  function onReversed(fact: ReportedOperationalFact) {
    const auth = authorizeFinanceOperationalWrite({
      session,
      organizationId: fact.organizationId,
    });
    if (!auth.ok) {
      setWriteError(financePermissionCopy(auth.reason).description);
      return;
    }
    setFacts((current) => current.map((item) => (item.id === fact.id ? fact : item)));
    setCorrectsFactId(fact.id);
    setNotice(REPORTED_FACT_NOT_PERSISTED_COPY);
    setWriteError(null);
  }

  return (
    <div data-finance-status="ready" className="space-y-8">
      {/* Provenance strip — calm, not warning-dominated */}
      <aside
        className="max-w-2xl rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_78%,white)] px-5 py-4 shadow-[var(--isalwa-shadow-soft)]"
        aria-label="Alcance del registro"
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="manual">Dato manual</StatusPill>
          <StatusPill tone="neutral">No es libro contable</StatusPill>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {FINANCE_DESK_COPY.boundaryManual} Queda pendiente de confirmar en la empresa; no abre
          Ingresos ni contabilidad oficial.
        </p>
      </aside>

      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <PageSection
          card
          className="min-w-0 space-y-4 p-6 shadow-[var(--isalwa-shadow-resting)] md:p-8"
        >
          <div>
            <p className="isalwa-kicker">Registro</p>
            <h2 className="mt-2 text-sm font-medium text-[var(--isalwa-kiln)]">
              {FINANCE_DESK_COPY.subjectIntro}
            </h2>
          </div>
          <div>
            <label htmlFor="finance-subject-type" className="isalwa-section-label">
              {FINANCE_DESK_COPY.subjectType}
            </label>
            <select
              id="finance-subject-type"
              className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)]"
              value={subjectType}
              onChange={(event) => setSubjectType(event.target.value as SubjectType)}
            >
              <option value="order">{FINANCE_DESK_COPY.subjectOrder}</option>
              <option value="party">{FINANCE_DESK_COPY.subjectParty}</option>
              <option value="quote">{FINANCE_DESK_COPY.subjectQuote}</option>
            </select>
          </div>
          <div>
            <label htmlFor="finance-subject-id" className="isalwa-section-label">
              {FINANCE_DESK_COPY.subjectId}
            </label>
            <input
              id="finance-subject-id"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)]"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="finance-subject-label" className="isalwa-section-label">
              {FINANCE_DESK_COPY.subjectLabel}
            </label>
            <input
              id="finance-subject-label"
              value={subjectLabel}
              onChange={(event) => setSubjectLabel(event.target.value)}
              className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)]"
              autoComplete="off"
            />
          </div>

          {writeError ? (
            <p className="text-sm text-[var(--isalwa-danger)]" role="alert">
              {writeError}
            </p>
          ) : null}
          {notice ? (
            <p className="text-sm leading-relaxed text-[var(--isalwa-kiln)]" role="status">
              {notice}
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
              {REPORTED_FACT_NOT_PERSISTED_COPY}
            </p>
          )}

          {canShowForm ? (
            <div className="border-t border-[var(--isalwa-mist)] pt-4 [&_button[type=submit]]:sticky [&_button[type=submit]]:bottom-3 [&_button[type=submit]]:z-10 [&_button[type=submit]]:shadow-[var(--isalwa-shadow-resting)]">
              <ManualPaymentForm
                organizationId={props.organizationId}
                subjectType={subjectType}
                subjectId={trimmedSubjectId}
                subjectLabel={subjectLabel.trim() || trimmedSubjectId}
                reportedByLabel={props.actorLabel}
                onRecorded={onRecorded}
              />
            </div>
          ) : null}
        </PageSection>

        <div className="min-w-0 space-y-4">
          <div className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_55%,white)] p-5 md:p-6">
            <p className="isalwa-section-label">Límites</p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
              <li>{FINANCE_DESK_COPY.boundaryOfficial}</li>
              <li>{FINANCE_DESK_COPY.boundaryConfirm}</li>
              <li>{FINANCE_DESK_COPY.noIngresos}</li>
            </ul>
          </div>

          <PageSection card className="min-w-0 space-y-1 p-5 md:p-6">
            <p className="isalwa-section-label">Proveniencia</p>
            {facts.length === 0 ? (
              <EmptyState
                className="mt-3"
                title={FINANCE_DESK_COPY.emptyFacts}
                description="Indique el pedido o cliente y registre un pago reportado. Queda pendiente de confirmar."
                example="Un pago reportado sobre un pedido aparece aquí con quién lo cargó y que aún no está confirmado."
              />
            ) : (
              <div className="mt-2 divide-y divide-[var(--isalwa-mist)]">
                {facts.map((fact) => (
                  <ReportedFactProvenance
                    key={`${fact.id}:${fact.activity}`}
                    fact={fact}
                    onReversed={onReversed}
                  />
                ))}
              </div>
            )}
          </PageSection>
        </div>
      </div>
    </div>
  );
}
