import type { ReactNode } from 'react';
import { PageSection, SectionHeader } from '@isalwa/ui';
import type { LeadershipBundle } from '@/lib/leadership/load-inicio-leadership';
import { OpportunityOrgList } from '@/components/commercial/opportunity-org-list';
import { QuoteOrgList } from '@/components/commercial/quote-org-list';
import { WorkList } from '@/components/work/work-list';
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
  children,
}: {
  title: string;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{title}</h3>
      {empty ? (
        <p className="mt-2 px-1 text-sm text-[var(--isalwa-slate)]">{t('pages.inicio.leadershipEmpty')}</p>
      ) : (
        <div className="mt-2">{children}</div>
      )}
    </div>
  );
}

export function InicioLeadershipSection({
  variant,
  data,
  unavailable,
  memberLabels,
  partyLabels,
}: {
  variant: LeadershipVariant;
  data?: LeadershipBundle;
  unavailable?: boolean;
  memberLabels: MemberLabelMap;
  partyLabels: PartyLabelMap;
}) {
  const copy = COPY[variant];
  return (
    <PageSection card className="p-4" aria-label={t(copy.title)}>
      <SectionHeader kicker={t(copy.kicker)} title={t(copy.title)} />
      <p className="mb-4 px-1 text-sm text-[var(--isalwa-slate)]">
        {t(copy.description)} {t('pages.inicio.leadershipReadOnly')}
      </p>
      {unavailable || !data ? (
        <p className="px-2 text-sm text-[var(--isalwa-slate)]">{t('pages.inicio.leadershipUnavailable')}</p>
      ) : (
        <div className="space-y-6">
          <FactList title={t(copy.opportunities)} empty={data.opportunities.length === 0}>
            <OpportunityOrgList
              items={data.opportunities}
              memberLabels={memberLabels}
              partyLabels={partyLabels}
              compact
            />
          </FactList>
          <FactList title={t(copy.quotesDraft)} empty={data.quotesDraft.length === 0}>
            <QuoteOrgList
              items={data.quotesDraft}
              memberLabels={memberLabels}
              partyLabels={partyLabels}
              compact
              showAmount={false}
            />
          </FactList>
          <FactList title={t(copy.quotesSubmitted)} empty={data.quotesSubmitted.length === 0}>
            <QuoteOrgList
              items={data.quotesSubmitted}
              memberLabels={memberLabels}
              partyLabels={partyLabels}
              compact
              showAmount={false}
            />
          </FactList>
          <FactList title={t(copy.work)} empty={data.openWork.length === 0}>
            <WorkList items={data.openWork} memberLabels={memberLabels} showApproval={false} />
          </FactList>
          <FactList title={t(copy.overdue)} empty={data.overdueWork.length === 0}>
            <WorkList items={data.overdueWork} memberLabels={memberLabels} showApproval={false} />
          </FactList>
          <FactList title={t(copy.followUp)} empty={data.followUps.length === 0}>
            <WorkList
              items={data.followUps}
              memberLabels={memberLabels}
              presentation="follow-up"
              showApproval={false}
            />
          </FactList>
          {data.hasMore ? (
            <p className="px-2 text-sm text-[var(--isalwa-slate)]">{t('pages.inicio.leadershipMore')}</p>
          ) : null}
        </div>
      )}
    </PageSection>
  );
}
