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
import { ListPageNav } from '@/components/lists/list-page-nav';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { cursorPageLinks, listHref, parseListQuery, parsePanel } from '@/lib/lists/url-state';
import { parseListDensity } from '@/lib/productivity/list-controls';
import { actorCanMutateMasterData } from '@/lib/party/master-data-access';
import { newCustomerHref } from '@/lib/party/navigation';
import type { PartySearchParams } from '@/lib/party/types';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import { filterByDemoDataMode, isDemoDisplayName } from '@/lib/demo/owner-demo-identity';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { evaluationAllowsDesk } from '@/lib/role-preview/evaluation-resource-access';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';

type ClientesPageProps = {
  searchParams: Promise<PartySearchParams & { panel?: string | string[]; datos?: string | string[] }>;
};

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const params = await searchParams;
  const listQuery = parseListQuery(params);
  const dataMode = await resolveDemoDataMode(params);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'commercial')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Clientes" />;
  }

  const client = createOsApiClient(auth);
  const q = listQuery.q;
  const roleKey = listQuery.roleKey;
  const status = listQuery.status;
  const cursor = listQuery.cursor;
  const panel = parsePanel(listQuery.panel);
  const canAddCustomer = evaluation.active ? false : await actorCanMutateMasterData(client);
  const listDensity = parseListDensity(listQuery.density);
  const densityToggleState: typeof listQuery = { ...listQuery };
  delete densityToggleState.cursor;
  if (listDensity === 'compact') {
    densityToggleState.density = 'comfortable';
  } else {
    delete densityToggleState.density;
  }
  const densityToggleHref = listHref('/clientes', densityToggleState);

  try {
    // Demo mode: prefer DEMO-prefixed search so SYNTH fixtures are not buried under REAL pages.
    const effectiveQ = q || (dataMode === 'demo' ? 'DEMO' : undefined);
    const result = await client.searchParties({
      ...(effectiveQ ? { q: effectiveQ } : {}),
      ...(roleKey ? { roleKey } : {}),
      status: status || 'active',
      ...(dataMode === 'demo' ? {} : cursor ? { cursor } : {}),
      limit: dataMode === 'demo' ? 50 : 25,
    });

    let filteredItems = filterByDemoDataMode(result.items, dataMode, (item) =>
      isDemoDisplayName(item.displayName || item.legalName),
    );
    // Vista de evaluación · Asesor: person-specific commercial owner slice only.
    if (evaluation.active && evaluation.persona === 'asesor') {
      const subject = evaluation.subjectMemberId;
      filteredItems = subject
        ? filteredItems.filter((item) => item.commercialOwnerMemberId === subject)
        : [];
    }
    const ownerIds = filteredItems
      .map((item) => item.commercialOwnerMemberId)
      .filter((id): id is string => Boolean(id));
    const memberLabels =
      ownerIds.length > 0 ? await resolveMemberLabels(client, ownerIds) : undefined;
    const hasSearchCriteria = Boolean(q || roleKey || status);
    const isEmpty = filteredItems.length === 0;
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
          <PartySearchForm
            initialQuery={q}
            initialRoleKey={roleKey}
            initialStatus={status}
            listDensity={listDensity}
            densityToggleHref={densityToggleHref}
          />
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
                    items={filteredItems}
                    listPath="/clientes"
                    listQuery={listQuery}
                    memberLabels={memberLabels}
                    density={listDensity}
                  />
                </div>
              </PageSection>

              {dataMode !== 'demo'
                ? (() => {
                    const nav = cursorPageLinks(
                      '/clientes',
                      { q, roleKey, status, cursor, panel: listQuery.panel },
                      result.meta.nextCursor,
                      result.meta.hasMore,
                    );
                    return nav.prevHref || nav.nextHref ? (
                      <ListPageNav
                        from={0}
                        to={filteredItems.length}
                        total={null}
                        page={1}
                        pageCount={null}
                        prevHref={nav.prevHref}
                        nextHref={nav.nextHref}
                      />
                    ) : null;
                  })()
                : null}
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
