import Link from 'next/link';
import { EmptyState, PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { PartyList } from '@/components/party/party-list';
import { PartyEmptySearch } from '@/components/party/party-placeholders';
import { PartySearchForm } from '@/components/party/party-search-form';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { clientesSearchHref } from '@/lib/party/navigation';
import type { PartySearchParams } from '@/lib/party/types';
import { classifyQueryError } from '@/lib/work/query-errors';

type ClientesPageProps = {
  searchParams: Promise<PartySearchParams>;
};

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const params = await searchParams;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const q = params.q?.trim();
  const roleKey = params.roleKey?.trim();
  const status = params.status?.trim();
  const cursor = params.cursor?.trim();

  try {
    const result = await client.searchParties({
      ...(q ? { q } : {}),
      ...(roleKey ? { roleKey } : {}),
      ...(status ? { status } : {}),
      ...(cursor ? { cursor } : {}),
      limit: 25,
    });

    const hasSearchCriteria = Boolean(q || roleKey || status);
    const isEmpty = result.items.length === 0;

    return (
      <PageContainer label="Clientes">
        <PageHeader
          kicker="Relaciones"
          title="Clientes"
          description="Busque empresas y contactos. Una misma empresa puede tener varias relaciones comerciales."
        />

        <PartySearchForm initialQuery={q} initialRoleKey={roleKey} initialStatus={status} />

        <div className="mt-8">
          <StaleProjectionBanner freshness={result.freshness} />

          {isEmpty ? (
            <PartyEmptySearch hasQuery={hasSearchCriteria} />
          ) : (
            <>
              <PageSection card className="mt-4 p-2 md:p-3">
                <PartyList items={result.items} />
              </PageSection>

              {result.meta.hasMore && result.meta.nextCursor ? (
                <div className="mt-6 flex justify-center">
                  <Link
                    href={clientesSearchHref({
                      q,
                      roleKey,
                      status,
                      cursor: result.meta.nextCursor,
                    })}
                    className="isalwa-t-fast inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-5 text-sm font-medium text-[var(--isalwa-kiln)] hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                  >
                    Cargar más
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>
      </PageContainer>
    );
  } catch (err) {
    return (
      <PageContainer label="Clientes">
        <PageHeader kicker="Relaciones" title="Clientes" />
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
