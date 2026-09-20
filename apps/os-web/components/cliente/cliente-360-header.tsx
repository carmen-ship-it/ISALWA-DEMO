'use client';

import Link from 'next/link';
import { ActionBar } from '@isalwa/ui';
import { PartyStatusBadge } from '@/components/party/party-role-badges';
import { ProximoPasoStrip } from '@/components/shell/proximo-paso-strip';
import { CLIENTE360_UX_COPY } from '@/lib/cliente/copy';
import { displayCliente360NextAction } from '@/lib/cliente/next-action-display';
import { clienteSectionHref, newOpportunityHref } from '@/lib/commercial/navigation';
import type { Cliente360Composition } from '@/lib/party/next-action';
import { FOLLOW_UP_COPY } from '@/lib/work/follow-up';
import { Cliente360ActionsMenu } from '@/components/cliente/cliente-360-actions-menu';
import type { ReportIssueContext } from '@/lib/issue/types';
import type { PartyDetailResponse } from '@/lib/party/types';
import { actionPrimaryClass, actionSecondaryClass } from '@/lib/ui/action-hierarchy';

const helpLinkClass =
  'text-sm font-medium text-[var(--isalwa-info)] underline-offset-4 hover:underline';

export type Cliente360HeaderProps = {
  partyId: string;
  displayName: string;
  status: string;
  composition: Cliente360Composition;
  party: PartyDetailResponse['party'];
  contacts: PartyDetailResponse['contacts'];
  canEditParty: boolean;
  canEditContacts: boolean;
  canReassignOwner: boolean;
  /** When false (Vista de evaluación), hide mutating CTAs. */
  allowMutations?: boolean;
  ownerLabel: string;
  commercialAccountId: string | null;
  currentOwnerMemberId: string | null;
  issueContext: ReportIssueContext;
  reportedByLabel?: string;
  organizationId: string;
  actorMemberId: string;
  manualSubjectLabel: string;
  manualOrganizationId: string;
  manualSubjectId: string;
};

export function Cliente360Header({
  partyId,
  displayName,
  status,
  composition,
  party,
  contacts,
  canEditParty,
  canEditContacts,
  canReassignOwner,
  allowMutations = true,
  ownerLabel,
  commercialAccountId,
  currentOwnerMemberId,
  issueContext,
  reportedByLabel,
  organizationId,
  actorMemberId,
  manualSubjectLabel,
  manualOrganizationId,
  manualSubjectId,
}: Cliente360HeaderProps) {
  const next = displayCliente360NextAction(composition.nextAction);
  const contactName = composition.primaryContact.name;
  const phone = composition.primaryContact.phone;
  const locationSummary = composition.location.summary;

  const facts = [
    phone ? phone : null,
    contactName ? contactName : null,
    locationSummary ? locationSummary : null,
    ownerLabel ? `Resp. ${ownerLabel}` : null,
  ].filter((fact): fact is string => Boolean(fact));

  const menuProps = {
    partyId,
    party,
    contacts,
    canEditParty: allowMutations && canEditParty,
    canEditContacts: allowMutations && canEditContacts,
    canReassignOwner: allowMutations && canReassignOwner,
    allowMutations,
    ownerLabel,
    commercialAccountId,
    currentOwnerMemberId,
    issueContext,
    reportedByLabel: allowMutations ? reportedByLabel : undefined,
    organizationId,
    actorMemberId: allowMutations ? actorMemberId : '',
    manualSubjectLabel,
    manualOrganizationId: allowMutations ? manualOrganizationId : '',
    manualSubjectId: allowMutations ? manualSubjectId : '',
  };

  return (
    <div className="flex flex-col gap-2.5 py-2">
      <ActionBar className="items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="isalwa-kicker text-[10px] tracking-[0.14em]">{CLIENTE360_UX_COPY.identityLabel}</p>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold leading-snug text-[var(--isalwa-kiln)] md:text-xl">
              {displayName}
            </h1>
            <PartyStatusBadge status={status} />
          </div>
          {facts.length > 0 ? (
            <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-[var(--isalwa-slate)] sm:grid-cols-2 lg:grid-cols-4">
              {phone ? (
                <div>
                  <dt className="isalwa-section-label">Teléfono</dt>
                  <dd className="mt-0.5 font-medium text-[var(--isalwa-kiln)]">{phone}</dd>
                </div>
              ) : null}
              {contactName ? (
                <div>
                  <dt className="isalwa-section-label">Contacto</dt>
                  <dd className="mt-0.5 font-medium text-[var(--isalwa-kiln)]">{contactName}</dd>
                </div>
              ) : null}
              {locationSummary ? (
                <div>
                  <dt className="isalwa-section-label">Ubicación</dt>
                  <dd className="mt-0.5 font-medium text-[var(--isalwa-kiln)]">{locationSummary}</dd>
                </div>
              ) : null}
              {ownerLabel ? (
                <div>
                  <dt className="isalwa-section-label">Responsable</dt>
                  <dd className="mt-0.5 font-medium text-[var(--isalwa-kiln)]">{ownerLabel}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {allowMutations ? (
            <>
              <Link href={newOpportunityHref(partyId)} className={actionPrimaryClass}>
                Nueva oportunidad
              </Link>
              <Link href={clienteSectionHref(partyId, 'trabajo')} className={actionSecondaryClass}>
                {FOLLOW_UP_COPY.action}
              </Link>
            </>
          ) : null}
          <Cliente360ActionsMenu {...menuProps} />
        </div>
      </ActionBar>

      <ProximoPasoStrip
        heading={next.isRegisteredAction ? CLIENTE360_UX_COPY.nextActionHeading : FOLLOW_UP_COPY.nextAction}
        text={next.text}
        href={next.href}
        dueText={next.dueText}
        overdue={next.overdue}
        data-tour="cliente360-next-action"
        trailing={
          allowMutations && !next.isRegisteredAction ? (
            <button
              type="button"
              className={helpLinkClass}
              onClick={() => {
                document.dispatchEvent(new CustomEvent('cliente360:open-drawer', { detail: { kind: 'follow_up' } }));
              }}
            >
              {CLIENTE360_UX_COPY.scheduleFollowUp}
            </button>
          ) : null
        }
      />
    </div>
  );
}
