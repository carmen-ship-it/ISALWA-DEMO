import type {
  OpportunitySummaryReadModel,
  OrderSummaryReadModel,
  QuoteSummaryReadModel,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import type { IssueListItem } from '@/lib/issue/types';
import {
  countConvertedQuotesInPeriod,
  countIssuedQuotesInPeriod,
  quoteToOrderRateDisplay,
} from '@/lib/management/quote-to-order-rate';
import type { ManagementPeriod } from '@/lib/management/org-metrics';

export type TeamMemberMetricsRow = {
  memberId: string;
  assignedClients: number | null;
  openOpportunities: number;
  issuedQuotes: number;
  convertedQuotes: number;
  quoteToOrderRate: string;
  overdueFollowUps: number;
  openIssues: number;
  href: string;
};

function memberKey(memberId: string): string {
  return memberId.trim();
}

/** Alphabetical by memberId — no performance ranking. */
export function composeTeamMetricsRows(input: {
  period: ManagementPeriod;
  opportunities: readonly OpportunitySummaryReadModel[];
  quotes: readonly QuoteSummaryReadModel[];
  orders: readonly OrderSummaryReadModel[];
  overdueWork: readonly WorkSummaryReadModel[];
  openIssues: readonly IssueListItem[];
  partyCountByOwner: ReadonlyMap<string, number>;
}): TeamMemberMetricsRow[] {
  const orderQuoteIds = new Set(input.orders.map((row) => row.quoteId));
  const memberIds = new Set<string>();
  for (const row of input.opportunities) memberIds.add(memberKey(row.ownerMemberId));
  for (const row of input.quotes) memberIds.add(memberKey(row.ownerMemberId));
  for (const row of input.overdueWork) memberIds.add(memberKey(row.ownerMemberId));
  for (const row of input.openIssues) {
    if (row.ownerMemberId) memberIds.add(memberKey(row.ownerMemberId));
  }

  const sorted = [...memberIds].sort((a, b) => a.localeCompare(b));

  return sorted.map((memberId) => {
    const memberQuotes = input.quotes.filter((row) => memberKey(row.ownerMemberId) === memberId);
    const issued = countIssuedQuotesInPeriod(memberQuotes, input.period.from, input.period.to);
    const converted = countConvertedQuotesInPeriod(
      memberQuotes,
      orderQuoteIds,
      input.period.from,
      input.period.to,
    );

    return {
      memberId,
      assignedClients: input.partyCountByOwner.get(memberId) ?? null,
      openOpportunities: input.opportunities.filter(
        (row) => memberKey(row.ownerMemberId) === memberId && row.status === 'open',
      ).length,
      issuedQuotes: issued,
      convertedQuotes: converted,
      quoteToOrderRate: quoteToOrderRateDisplay(converted, issued),
      overdueFollowUps: input.overdueWork.filter((row) => memberKey(row.ownerMemberId) === memberId)
        .length,
      openIssues: input.openIssues.filter(
        (row) => row.ownerMemberId && memberKey(row.ownerMemberId) === memberId,
      ).length,
      href: `/trabajo?view=team&owner=${encodeURIComponent(memberId)}`,
    };
  });
}
