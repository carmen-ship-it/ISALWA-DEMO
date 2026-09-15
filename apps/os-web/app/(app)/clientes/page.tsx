import { Suspense } from 'react';
import Link from 'next/link';
import { PageSection } from '@isalwa/ui';
import { CommercialPageFrame } from '@/components/commercial/commercial-page-frame';
import {
  commercialPrimaryLinkClass,
  commercialToolbarClass,
  commercialWorkSurfaceClass,
} from '@/components/commercial/commercial-surfaces';
import '@/components/commercial/commercial-surfaces.css';
import { CustomerQuickView } from '@/components/operating/customer-quick-view';
import { PartyList } from '@/components/party/party-list';
import { PartyEmptySearch } from '@/components/party/party-placeholders';
import { PartySearchForm } from '@/components/party/party-search-form';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { listHref, parseListQuery, parsePanel } from '@/lib/lists/url-state';
import { actorCanMutateMasterData } from '@/lib/party/master-data-access';
import { newCustomerHref } from '@/lib/party/navigation';
import type { PartySearchParams } from '@/lib/party/types';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';

type ClientesPageProps = {
  searchParams: Promise<PartySearchParams & { panel?: string | string[] }>;
};

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const params = await searchParams;
  const listQuery = parseListQuery(params);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const q = listQuery.q;
  const roleKey = listQuery.roleKey;
  const status = listQuery.status;
  const cursor = listQuery.cursor;
  const panel = parsePanel(listQuery.panel);
  const canAddCustomer = await actorCanMutateMasterData(client);

  try {
    const result = await client.searchParties({
      ...(q ? { q } : {}),
      ...(roleKey ? { roleKey } : {}),
      status: status || 'active',
      ...(cursor ? { cursor } : {}),
      limit: 25,
    });

    const ownerIds = result.items
      .map((item) => item.commercialOwnerMemberId)
      .filter((id): id is string => Boolean(id));
    const memberLabels =
      ownerIds.length > 0 ? await resolveMemberLabels(client, ownerIds) : undefined;
    const hasSearchCriteria = Boolean(q || roleKey || status);
    const isEmpty = result.items.length === 0;
    const addHref = canAddCustomer ? newCustomerHref(q) : undefined;

    return (
      <CommercialPageFrame label="Clientes">
        <PageHeader
          kicker="Relaciones"
          title="Clientes"
          description="Busque empresas y contactos. Una misma empresa puede tener varias relaciones comerciales."
          action={
            addHref ? (
              <Link href={addHref} className={commercialPrimaryLinkClass}>
                Agregar cliente
              </Link>
            ) : undefined
          }
        />

        <div className={`commercial-toolbar ${commercialToolbarClass}`} data-tour="clientes-search">
          <PartySearchForm initialQuery={q} initialRoleKey={roleKey} initialStatus={status} />
        </div>
        <p className="mt-3 text-sm">
          <Link href="/mapa" className="font-medium text-[var(--isalwa-glaze)] hover:underline">
            Mapa y salud de datos
          </Link>
        </p>

        <div className="mt-8">
          <StaleProjectionBanner freshness={result.freshness} />

          {isEmpty ? (
            <PartyEmptySearch hasQuery={hasSearchCriteria} addCustomerHref={addHref} />
          ) : (
            <>
              <PageSection card className={`mt-4 p-0 ${commercialWorkSurfaceClass}`}>
                <div className="commercial-operating-list" data-tour="clientes-list">
                  <PartyList
                    items={result.items}
                    listPath="/clientes"
                    listQuery={listQuery}
                    memberLabels={memberLabels}
                  />
                </div>
              </PageSection>

              {result.meta.hasMore && result.meta.nextCursor ? (
                <div className="mt-6 flex justify-center">
                  <Link
                    href={listHref('/clientes', {
                      q,
                      roleKey,
                      status,
                      cursor: result.meta.nextCursor,
                      panel: listQuery.panel,
                    })}
                    className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                  >
                    Cargar más
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>

        {panel?.kind === 'party' ? (
          <Suspense fallback={null}>
            <CustomerQuickView
              client={client}
              partyId={panel.id}
              listPath="/clientes"
              listQuery={listQuery}
            />
          </Suspense>
        ) : null}
      </CommercialPageFrame>
    );
  } catch (err) {
    return (
      <CommercialPageFrame label="Clientes">
        <PageHeader kicker="Relaciones" title="Clientes" />
        <QuerySurfaceState error={classifyQueryError(err)} />
      </CommercialPageFrame>
    );
  }
}
