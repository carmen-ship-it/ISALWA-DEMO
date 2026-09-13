import Link from 'next/link';
import { Button, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { QuoteEditor } from '@/components/commercial/quote-editor';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import {
  formatQuoteStatus,
  formatTimestamp,
  statusTone,
} from '@/lib/commercial/labels';
import { formatCentavos } from '@/lib/commercial/money';
import { partyHref } from '@/lib/party/navigation';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';

type QuoteDetailPageProps = {
  params: Promise<{ partyId: string; quoteId: string }>;
};

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { partyId, quoteId } = await params;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const { quote, freshness } = await client.getQuote(quoteId);
    const memberLabels = await resolveMemberLabels(client, [quote.ownerMemberId]);

    return (
      <PageContainer label={quote.quoteNumber}>
        <PageHeader
          kicker="Cotización"
          title={quote.quoteNumber}
          action={
            <Link href={partyHref(partyId)}>
              <Button type="button" variant="secondary">
                Volver al cliente
              </Button>
            </Link>
          }
        />

        <StaleProjectionBanner freshness={freshness} />

        <PageSection card className="p-6">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={statusTone(quote.status)}>
              {formatQuoteStatus(quote.status)}
            </StatusPill>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="isalwa-section-label">Total</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">
                {formatCentavos(quote.totalCentavos, quote.currency)}
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Responsable</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">
                {memberLabel(memberLabels, quote.ownerMemberId)}
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Creada</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">{formatTimestamp(quote.createdAt)}</dd>
            </div>
            {quote.submittedAt ? (
              <div>
                <dt className="isalwa-section-label">Enviada</dt>
                <dd className="mt-1 text-[var(--isalwa-kiln)]">
                  {formatTimestamp(quote.submittedAt)}
                </dd>
              </div>
            ) : null}
            {quote.cancelledAt ? (
              <div>
                <dt className="isalwa-section-label">Cancelada</dt>
                <dd className="mt-1 text-[var(--isalwa-kiln)]">
                  {formatTimestamp(quote.cancelledAt)}
                </dd>
              </div>
            ) : null}
          </dl>
        </PageSection>

        <QuoteEditor partyId={partyId} quote={quote} />
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return (
        <PageContainer label="Cotización">
          <QuerySurfaceState
            error={{ kind: 'unknown', message: 'No se encontró esta cotización.' }}
          />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Cotización">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
