import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button, EmptyState, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import type { AttentionItemReadModel } from '@isalwa/os-contracts';
import type { LeadershipBundle } from '@/lib/leadership/load-inicio-leadership';
import { ExecutiveCommandCenter } from '@/components/executive/command-center-panel';
import { OpportunityOrgList } from '@/components/commercial/opportunity-org-list';
import { QuoteOrgList } from '@/components/commercial/quote-org-list';
import { WorkList } from '@/components/work/work-list';
import { composeExecutiveCommand } from '@/lib/executive/command-center';
import { t } from '@/lib/i18n/es';
import type { PartyLabelMap } from '@/lib/commercial/party-resolver';
import type { MemberLabelMap } from '@/lib/work/member-resolver';

type LeadershipVariant = 'team' | 'org';

const COPY: Record<
  LeadershipVariant,
  {
    kicker: string;
    title: string;
    description: string;
    opportunities: string;
    quotesDraft: string;
    quotesSubmitted: string;
    work: string;
    overdue: string;
    followUp: string;
  }
> = {
  team: {
    kicker: 'pages.inicio.teamKicker',
    title: 'pages.inicio.teamTitle',
    description: 'pages.inicio.teamDescription',
    opportunities: 'pages.inicio.teamOpportunities',
    quotesDraft: 'pages.inicio.teamQuotesDraft',
    quotesSubmitted: 'pages.inicio.teamQuotesSubmitted',
    work: 'pages.inicio.teamWork',
    overdue: 'pages.inicio.teamOverdue',
    followUp: 'pages.inicio.teamFollowUp',
  },
  org: {
    kicker: 'pages.inicio.orgKicker',
    title: 'pages.inicio.orgTitle',
    description: 'pages.inicio.orgDescription',
    opportunities: 'pages.inicio.orgOpportunities',
    quotesDraft: 'pages.inicio.orgQuotesDraft',
    quotesSubmitted: 'pages.inicio.orgQuotesSubmitted',
    work: 'pages.inicio.orgWork',
    overdue: 'pages.inicio.orgOverdue',
    followUp: 'pages.inicio.orgFollowUp',
  },
};

function FactList({
  title,
  empty,
  emptyHint,
  children,
}: {
  title: string;
  empty: boolean;
  emptyHint: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-[var(--isalwa-mist)] pt-6 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{title}</h3>
      {empty ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">{emptyHint}</p>
      ) : (
        <div className="mt-2 min-w-0">{children}</div>
      )}
    </div>
  );
}

function lensIsEmpty(data: LeadershipBundle): boolean {
  return (
    data.opportunities.length === 0 &&
    data.quotesDraft.length === 0 &&
    data.quotesSubmitted.length === 0 &&
    data.openWork.length === 0 &&
    data.overdueWork.length === 0 &&
    data.followUps.length === 0
  );
}

export function InicioLeadershipSection({
  variant,
  data,
  unavailable,
  memberLabels,
  partyLabels,
  attentionItems,
}: {
  variant: LeadershipVariant;
  data?: LeadershipBundle;
  unavailable?: boolean;
  memberLabels: MemberLabelMap;
  partyLabels: PartyLabelMap;
  /** Optional. The Inicio page does not pass this yet. */
  attentionItems?: AttentionItemReadModel[];
}) {
  const copy = COPY[variant];
  const scope = variant === 'team' ? 'del equipo' : 'de la empresa';
  const emptyLens = Boolean(data && lensIsEmpty(data));

  return (
    <section aria-label={t(copy.title)} className="min-w-0">
      <SectionHeader
        kicker={t(copy.kicker)}
        title={t(copy.title)}
        action={<StatusPill tone="neutral">Solo lectura</StatusPill>}
      />
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {t(copy.description)} {t('pages.inicio.leadershipReadOnly')}
      </p>
      {unavailable || !data ? (
        <p className="text-sm text-[var(--isalwa-slate)]">{t('pages.inicio.leadershipUnavailable')}</p>
      ) : emptyLens ? (
        <EmptyState
          title={t(copy.title)}
          description={`No hay registros ${scope} en esta lectura. Puede continuar en Clientes o en Trabajo.`}
          action={
            <div className="flex flex-wrap gap-3">
              <Link href="/trabajo" className="inline-flex">
                <Button type="button" variant="primary">
                  {t('states.viewWork')}
                </Button>
              </Link>
              <Link href="/clientes" className="inline-flex">
                <Button type="button" variant="secondary">
                  {t('states.goToClientes')}
                </Button>
              </Link>
            </div>
          }
        />
      ) : (
        <PageSection card className="min-w-0 p-5 md:p-6">
          <ExecutiveCommandCenter
            model={composeExecutiveCommand({
              opportunities: data.opportunities,
              quotesDraft: data.quotesDraft,
              quotesSubmitted: data.quotesSubmitted,
              openWork: data.openWork,
              overdueWork: data.overdueWork,
              followUps: data.followUps,
              attentionItems,
              memberLabels,
              partyLabels,
              partial: data.hasMore,
              identity: 'labeled',
            })}
          />
          <div>
            <FactList
              title={t(copy.opportunities)}
              empty={data.opportunities.length === 0}
              emptyHint={`No hay oportunidades abiertas ${scope}. El registro sigue en Clientes.`}
            >
              <OpportunityOrgList
                items={data.opportunities}
                memberLabels={memberLabels}
                partyLabels={partyLabels}
                compact
              />
            </FactList>
            <FactList
              title={t(copy.quotesDraft)}
              empty={data.quotesDraft.length === 0}
              emptyHint={`No hay cotizaciones en borrador ${scope}. Se preparan desde Clientes.`}
            >
              <QuoteOrgList
                items={data.quotesDraft}
                memberLabels={memberLabels}
                partyLabels={partyLabels}
                compact
                showAmount={false}
              />
            </FactList>
            <FactList
              title={t(copy.quotesSubmitted)}
              empty={data.quotesSubmitted.length === 0}
              emptyHint={`No hay cotizaciones enviadas ${scope}. El seguimiento continúa en Clientes.`}
            >
              <QuoteOrgList
                items={data.quotesSubmitted}
                memberLabels={memberLabels}
                partyLabels={partyLabels}
                compact
                showAmount={false}
              />
            </FactList>
            <FactList
              title={t(copy.work)}
              empty={data.openWork.length === 0}
              emptyHint={`No hay trabajo abierto ${scope}. El detalle sigue en Trabajo.`}
            >
              <WorkList items={data.openWork} memberLabels={memberLabels} showApproval={false} />
            </FactList>
            <FactList
              title={t(copy.overdue)}
              empty={data.overdueWork.length === 0}
              emptyHint={`No hay trabajo vencido ${scope}. El detalle sigue en Trabajo.`}
            >
              <WorkList items={data.overdueWork} memberLabels={memberLabels} showApproval={false} />
            </FactList>
            <FactList
              title={t(copy.followUp)}
              empty={data.followUps.length === 0}
              emptyHint={`No hay seguimientos ${scope}. El detalle sigue en Trabajo.`}
            >
              <WorkList
                items={data.followUps}
                memberLabels={memberLabels}
                presentation="follow-up"
                showApproval={false}
              />
            </FactList>
          </div>
          {data.hasMore ? (
            <p className="mt-6 text-sm text-[var(--isalwa-slate)]">{t('pages.inicio.leadershipMore')}</p>
          ) : null}
        </PageSection>
      )}
    </section>
  );
}
