import Link from 'next/link';
import { Button, ListRow, PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
import { CommitmentList } from '@/components/commitments/commitment-list';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { COMMITMENT_COPY } from '@/lib/commitments/copy';
import { commitmentChangeLine, commitmentChangeMemberIds } from '@/lib/commitments/history';
import { classifyQueryError } from '@/lib/work/query-errors';
import { resolveMemberLabels } from '@/lib/work/member-resolver';

type CommitmentDetailPageProps = {
  params: Promise<{ commitmentId: string }>;
};

/** Deep link of one commitment: its state, who may act on it, and everything that changed. */
export default async function CommitmentDetailPage({ params }: CommitmentDetailPageProps) {
  const { commitmentId } = await params;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  try {
    const commitment = await client.getCommitment(commitmentId);
    const { changes, ...summary } = commitment;
    const memberLabels = await resolveMemberLabels(client, [
      summary.ownerMemberId,
      summary.createdByMemberId,
      ...(summary.fulfilledByMemberId ? [summary.fulfilledByMemberId] : []),
      ...commitmentChangeMemberIds(changes),
    ]);
    const partyLabels = summary.partyId ? await resolvePartyLabels(client, [summary.partyId]) : null;
    const customer = summary.partyId && partyLabels ? partyLabel(partyLabels, summary.partyId) : null;
    const lines = [...changes]
      .sort((a, b) => (a.changedAt < b.changedAt ? 1 : a.changedAt > b.changedAt ? -1 : 0))
      .map((change) => commitmentChangeLine(change, memberLabels));

    return (
      <PageContainer label={COMMITMENT_COPY.title}>
        <PageHeader
          kicker={COMMITMENT_COPY.detailKicker}
          title={COMMITMENT_COPY.title}
          action={
            <div className="flex flex-wrap items-center gap-3">
              {summary.partyId ? (
                <Link href={`/clientes/${encodeURIComponent(summary.partyId)}`}>
                  <Button type="button" variant="secondary">
                    {customer && customer !== 'Cliente' ? customer : 'Ver cliente'}
                  </Button>
                </Link>
              ) : null}
              <Link href="/compromisos">
                <Button type="button" variant="secondary">
                  {COMMITMENT_COPY.title}
                </Button>
              </Link>
            </div>
          }
        />
        <PageSection card className="p-6 md:p-8">
          <CommitmentList
            items={[summary]}
            memberLabels={memberLabels}
            partyLabel={customer && customer !== 'Cliente' ? customer : null}
            hideHeader
            showDetailLink={false}
          />
        </PageSection>
        <PageSection card className="mt-6 p-6 md:p-8">
          <SectionHeader
            kicker={COMMITMENT_COPY.kicker}
            title={
              <h2 className="font-[var(--isalwa-font-display)] text-lg text-[var(--isalwa-kiln)] italic">
                {COMMITMENT_COPY.history}
              </h2>
            }
          />
          {lines.length === 0 ? (
            <p className="text-sm text-[var(--isalwa-slate)]">{COMMITMENT_COPY.historyEmpty}</p>
          ) : (
            <ul className="min-w-0" aria-label={COMMITMENT_COPY.history}>
              {lines.map((line) => (
                <ListRow key={line.id} as="li">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--isalwa-kiln)]">{line.title}</p>
                    {line.detail ? <p className="mt-1 text-xs text-[var(--isalwa-slate)]">{line.detail}</p> : null}
                  </div>
                  <p className="shrink-0 text-xs text-[var(--isalwa-slate)]">{line.when}</p>
                </ListRow>
              ))}
            </ul>
          )}
        </PageSection>
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return (
        <PageContainer label={COMMITMENT_COPY.title}>
          <QuerySurfaceState error={{ kind: 'unknown', message: COMMITMENT_COPY.notFound }} />
        </PageContainer>
      );
    }
    return (
      <PageContainer label={COMMITMENT_COPY.title}>
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
