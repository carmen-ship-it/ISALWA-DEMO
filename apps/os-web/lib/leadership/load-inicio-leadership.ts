import type { CommercialVisibilityMode } from '@isalwa/os-contracts';
import type {
  OpportunitySummaryReadModel,
  QuoteSummaryReadModel,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import type { OsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { INICIO_SECTION_LIMIT } from '@/lib/commercial/inicio-home';

export type LeadershipBundle = {
  opportunities: OpportunitySummaryReadModel[];
  quotesDraft: QuoteSummaryReadModel[];
  quotesSubmitted: QuoteSummaryReadModel[];
  openWork: WorkSummaryReadModel[];
  overdueWork: WorkSummaryReadModel[];
  followUps: WorkSummaryReadModel[];
  hasMore: boolean;
};

export type LeadershipLoad = { kind: 'hidden' } | { kind: 'unavailable' } | { kind: 'ready'; data: LeadershipBundle };

type LeadershipClient = Pick<OsApiClient, 'listOpportunities' | 'listQuotes' | 'listWorkItems'>;

export function isVisibilityDenied(err: unknown): boolean {
  return err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized');
}

async function probe(
  client: LeadershipClient,
  visibility: Extract<CommercialVisibilityMode, 'team' | 'org'>,
): Promise<'allowed' | 'denied' | 'unavailable'> {
  try {
    await client.listOpportunities({ visibility, status: 'open', limit: 1 });
    return 'allowed';
  } catch (err) {
    if (isVisibilityDenied(err)) return 'denied';
    return 'unavailable';
  }
}

async function loadBundle(
  client: LeadershipClient,
  visibility: Extract<CommercialVisibilityMode, 'team' | 'org'>,
): Promise<LeadershipLoad> {
  const limit = INICIO_SECTION_LIMIT;
  try {
    const [opportunities, quotesDraft, quotesSubmitted, openWork, overdueWork, followUps] =
      await Promise.all([
        client.listOpportunities({ visibility, status: 'open', limit }),
        client.listQuotes({ visibility, status: 'draft', limit }),
        client.listQuotes({ visibility, status: 'submitted', limit }),
        client.listWorkItems({ visibility, status: 'open', limit }),
        client.listWorkItems({ visibility, status: 'open', overdue: true, limit }),
        client.listWorkItems({ visibility, status: 'open', followUpOnly: true, limit }),
      ]);

    const pages = [opportunities, quotesDraft, quotesSubmitted, openWork, overdueWork, followUps];
    return {
      kind: 'ready',
      data: {
        opportunities: opportunities.items,
        quotesDraft: quotesDraft.items,
        quotesSubmitted: quotesSubmitted.items,
        openWork: openWork.items,
        overdueWork: overdueWork.items,
        followUps: followUps.items,
        hasMore: pages.some((page) => page.meta.hasMore),
      },
    };
  } catch (err) {
    if (isVisibilityDenied(err)) return { kind: 'hidden' };
    return { kind: 'unavailable' };
  }
}

export async function loadLeadershipView(
  client: LeadershipClient,
  visibility: Extract<CommercialVisibilityMode, 'team' | 'org'>,
): Promise<LeadershipLoad> {
  const allowed = await probe(client, visibility);
  if (allowed === 'denied') return { kind: 'hidden' };
  if (allowed === 'unavailable') return { kind: 'hidden' };
  return loadBundle(client, visibility);
}

export async function loadInicioLeadership(client: LeadershipClient): Promise<{
  team: LeadershipLoad;
  org: LeadershipLoad;
}> {
  const [team, org] = await Promise.all([
    loadLeadershipView(client, 'team'),
    loadLeadershipView(client, 'org'),
  ]);
  return { team, org };
}
