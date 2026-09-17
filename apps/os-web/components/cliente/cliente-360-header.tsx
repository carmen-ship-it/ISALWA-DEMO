'use client';

import Link from 'next/link';
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

const linkClass = 'text-sm font-medium text-[var(--isalwa-glaze)] hover:underline';

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
    phone ? `📞 ${phone}` : null,
    contactName ? `👤 ${contactName}` : null,
    locationSummary ? `📍 ${locationSummary}` : null,
  ].filter((fact): fact is string => Boolean(fact));

  const menuProps = {
    partyId,
    party,
    contacts,
    canEditParty,
    canEditContacts,
    canReassignOwner,
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
  };

  return (
    <div className="flex flex-col gap-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-[var(--isalwa-kiln)]">{displayName}</p>
            <PartyStatusBadge status={status} />
          </div>
          {facts.length > 0 ? (
            <p className="mt-1 break-words text-xs leading-4 text-[var(--isalwa-slate)]">{facts.join(' · ')}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={newOpportunityHref(partyId)} className={actionPrimaryClass}>
            Nueva oportunidad
          </Link>
          <Link href={clienteSectionHref(partyId, 'trabajo')} className={actionSecondaryClass}>
            {FOLLOW_UP_COPY.action}
          </Link>
          <Cliente360ActionsMenu {...menuProps} />
        </div>
      </div>

      <ProximoPasoStrip
        heading={next.isRegisteredAction ? CLIENTE360_UX_COPY.nextActionHeading : FOLLOW_UP_COPY.nextAction}
        text={next.text}
        href={next.href}
        dueText={next.dueText}
        overdue={next.overdue}
        data-tour="cliente360-next-action"
        trailing={
          !next.isRegisteredAction ? (
            <button
              type="button"
              className={linkClass}
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
