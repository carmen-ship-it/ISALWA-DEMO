'use client';

import { useMemo, useState } from 'react';
import { EmptyState, PageSection } from '@isalwa/ui';
import { SearchableSelect, type SearchableOption } from '@/components/experience/searchable-select';
import { ManualPaymentForm } from '@/components/operations/manual-payment-form';
import { ReportedFactProvenance } from '@/components/operations/reported-fact-provenance';
import { ServerPartyTypeahead } from '@/components/operating/server-party-typeahead';
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
      orderOptions?: readonly SearchableOption[];
      quoteOptions?: readonly SearchableOption[];
      initialSubjectType?: SubjectType;
      initialSubjectId?: string;
      initialSubjectLabel?: string;
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
      </div>
    );
  }

  return (
    <ReadyDesk
      organizationId={props.organizationId}
      memberId={props.memberId}
      actorLabel={props.actorLabel}
      grantedScopes={props.grantedScopes}
      orderOptions={props.orderOptions ?? []}
      quoteOptions={props.quoteOptions ?? []}
      initialSubjectType={props.initialSubjectType}
      initialSubjectId={props.initialSubjectId}
      initialSubjectLabel={props.initialSubjectLabel}
    />
  );
}

function ReadyDesk(props: {
  organizationId: string;
  memberId: string;
  actorLabel: string;
  grantedScopes: readonly string[];
  orderOptions: readonly SearchableOption[];
  quoteOptions: readonly SearchableOption[];
  initialSubjectType?: SubjectType;
  initialSubjectId?: string;
  initialSubjectLabel?: string;
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

  const [subjectType, setSubjectType] = useState<SubjectType>(props.initialSubjectType ?? 'order');
  const [subjectId, setSubjectId] = useState(props.initialSubjectId?.trim() ?? '');
  const [subjectLabel, setSubjectLabel] = useState(props.initialSubjectLabel?.trim() ?? '');
  const [facts, setFacts] = useState<ReportedOperationalFact[]>([]);
  const [correctsFactId, setCorrectsFactId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  const trimmedSubjectId = subjectId.trim();
  const canShowForm = trimmedSubjectId.length > 0;

  function clearSubject() {
    setSubjectId('');
    setSubjectLabel('');
  }

  function selectOption(optionId: string | null, options: readonly SearchableOption[]) {
    if (!optionId) {
      clearSubject();
      return;
    }
    const option = options.find((item) => item.id === optionId);
    if (!option) {
      clearSubject();
      return;
    }
    setSubjectId(option.id);
    setSubjectLabel(option.hint ? `${option.label} · ${option.hint}` : option.label);
  }

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
    <div data-finance-status="ready" className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
      <PageSection card className="min-w-0 space-y-4 p-5 shadow-[var(--isalwa-shadow-resting)] md:p-6">
        <div>
          <p className="isalwa-kicker">Contexto</p>
          <h2 className="mt-2 text-sm font-medium text-[var(--isalwa-kiln)]">
            {FINANCE_DESK_COPY.subjectIntro}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de sujeto">
          {(
            [
              { id: 'order' as const, label: FINANCE_DESK_COPY.subjectOrder },
              { id: 'party' as const, label: FINANCE_DESK_COPY.subjectParty },
              { id: 'quote' as const, label: FINANCE_DESK_COPY.subjectQuote },
            ] as const
          ).map((option) => {
            const selected = subjectType === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                className={
                  selected
                    ? 'isalwa-t-fast inline-flex h-9 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-kiln)] bg-white px-4 text-sm font-medium text-[var(--isalwa-kiln)]'
                    : 'isalwa-t-fast inline-flex h-9 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-4 text-sm font-medium text-[var(--isalwa-slate)] hover:border-[var(--isalwa-glaze)]'
                }
                onClick={() => {
                  setSubjectType(option.id);
                  clearSubject();
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {subjectType === 'order' ? (
          props.orderOptions.length === 0 ? (
            <p className="text-sm text-[var(--isalwa-slate)]" role="status">
              {FINANCE_DESK_COPY.subjectEmptyOrders}
            </p>
          ) : (
            <SearchableSelect
              id="finance-subject-order"
              label={FINANCE_DESK_COPY.subjectSelectOrder}
              options={props.orderOptions}
              value={subjectType === 'order' ? trimmedSubjectId || null : null}
              onChange={(id) => selectOption(id, props.orderOptions)}
              placeholder="Buscar pedido"
              noMatchLabel="Ningún pedido coincide"
            />
          )
        ) : null}

        {subjectType === 'quote' ? (
          props.quoteOptions.length === 0 ? (
            <p className="text-sm text-[var(--isalwa-slate)]" role="status">
              {FINANCE_DESK_COPY.subjectEmptyQuotes}
            </p>
          ) : (
            <SearchableSelect
              id="finance-subject-quote"
              label={FINANCE_DESK_COPY.subjectSelectQuote}
              options={props.quoteOptions}
              value={subjectType === 'quote' ? trimmedSubjectId || null : null}
              onChange={(id) => selectOption(id, props.quoteOptions)}
              placeholder="Buscar cotización"
              noMatchLabel="Ninguna cotización coincide"
            />
          )
        ) : null}

        {subjectType === 'party' ? (
          <ServerPartyTypeahead
            id="finance-subject-party"
            label={FINANCE_DESK_COPY.subjectSelectParty}
            required
            value={trimmedSubjectId}
            displayLabel={subjectLabel}
            onChange={({ partyId, label }) => {
              setSubjectId(partyId);
              setSubjectLabel(label);
            }}
          />
        ) : null}

        {canShowForm ? (
          <div
            className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_45%,white)] px-4 py-3"
            data-finance-subject-selected=""
          >
            <p className="isalwa-section-label">{FINANCE_DESK_COPY.subjectSelected}</p>
            <p className="mt-1 text-sm font-medium text-[var(--isalwa-kiln)]">
              {subjectLabel || trimmedSubjectId}
            </p>
          </div>
        ) : null}

        {writeError ? (
          <p className="text-sm text-[var(--isalwa-danger)]" role="alert">
            {writeError}
          </p>
        ) : null}
        {notice ? (
          <p className="text-sm leading-relaxed text-[var(--isalwa-kiln)]" role="status">
            {notice}
          </p>
        ) : canShowForm ? (
          <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {FINANCE_DESK_COPY.paymentHelper}
          </p>
        ) : null}

        {canShowForm ? (
          <div className="border-t border-[var(--isalwa-mist)] pt-4 [&_form]:border-t-0 [&_form]:pt-0 [&_button[type=submit]]:sticky [&_button[type=submit]]:bottom-3 [&_button[type=submit]]:z-10 [&_button[type=submit]]:shadow-[var(--isalwa-shadow-resting)]">
            <p className="mb-3 text-sm font-medium text-[var(--isalwa-kiln)]">
              {FINANCE_DESK_COPY.paymentSectionTitle}
            </p>
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

      <PageSection card className="min-w-0 space-y-1 p-5 md:p-6">
        <p className="isalwa-section-label">Esta sesión</p>
        {facts.length === 0 ? (
          <EmptyState
            className="mt-3"
            title={FINANCE_DESK_COPY.emptyFacts}
            description="Los pagos reportados aparecen aquí con procedencia visible."
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
  );
}
