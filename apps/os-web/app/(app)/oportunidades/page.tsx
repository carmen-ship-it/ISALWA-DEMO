import Link from 'next/link';
import { EmptyState, PageSection, cx } from '@isalwa/ui';
import { CommercialListToolbar } from '@/components/commercial/commercial-list-toolbar';
import { CommercialPageFrame } from '@/components/commercial/commercial-page-frame';
import { OpportunityOrgList } from '@/components/commercial/opportunity-org-list';
import {
  commercialPrimaryLinkClass,
  commercialToolbarClass,
  commercialWorkSurfaceClass,
} from '@/components/commercial/commercial-surfaces';
import '@/components/commercial/commercial-surfaces.css';
import { ListPageNav } from '@/components/lists/list-page-nav';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { formatOpportunityStatus, presentStage } from '@/lib/commercial/labels';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { t } from '@/lib/i18n/es';
import { cursorPageLinks, listHref, parseListQuery, type ListQueryState } from '@/lib/lists/url-state';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
import { filterByDemoDataMode, isDemoDisplayName } from '@/lib/demo/owner-demo-identity';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { commercialListQueryFromProjection } from '@/lib/role-preview/commercial-list-query';
import { evaluationAllowsDesk } from '@/lib/role-preview/evaluation-resource-access';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';
import { readListControls } from '@/lib/productivity/list-controls';

type OportunidadesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const OPPORTUNITY_LIST_STATUSES = ['open', 'won', 'lost', 'cancelled'] as const;
type OpportunityListStatus = (typeof OPPORTUNITY_LIST_STATUSES)[number];

const LIST_LIMIT = 25;
const LIST_PATH = '/oportunidades';

function parseOpportunityListStatus(raw: string | undefined): OpportunityListStatus {
  if (raw === 'open' || raw === 'won' || raw === 'lost' || raw === 'cancelled') return raw;
  return 'open';
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function withExactStage(href: string, stage: string | undefined): string {
  if (!stage) return href;
  const join = href.includes('?') ? '&' : '?';
  return `${href}${join}stage=${encodeURIComponent(stage)}`;
}

const tabClass = (active: boolean) =>
  cx(
    'isalwa-t-fast inline-flex h-9 items-center rounded-[var(--isalwa-radius-control)] border px-4 text-sm font-medium outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
    active
      ? 'border-[var(--isalwa-kiln)] bg-white text-[var(--isalwa-kiln)]'
      : 'border-[var(--isalwa-mist)] bg-white text-[var(--isalwa-slate)] hover:border-[var(--isalwa-glaze)]',
  );

function emptyDescription(status: OpportunityListStatus, hasQuery: boolean, stage?: string): string {
  if (hasQuery) {
    return 'Ninguna oportunidad de este estado coincide con el título buscado.';
  }
  if (stage) {
    return `No hay oportunidades en etapa exacta «${presentStage(stage)}». La etapa no es un pipeline.`;
  }
  if (status === 'open') {
    return 'Aquí aparecen las oportunidades abiertas, con cliente, etapa y responsable. Para registrar una, abra el cliente.';
  }
  return `No hay oportunidades con estado ${formatOpportunityStatus(status)}.`;
}

export default async function OportunidadesPage({ searchParams }: OportunidadesPageProps) {
  const params = await searchParams;
  const parsed = parseListQuery(params);
  const status = parseOpportunityListStatus(parsed.status);
  const stage = firstParam(params.stage);
  const listState: ListQueryState = { ...parsed, status };
  const dataMode = await resolveDemoDataMode(params);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'commercial')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Oportunidades" />;
  }
  const client = createOsApiClient(auth);

  try {
    const commercialQuery = commercialListQueryFromProjection(evaluation);
    const [result, linkedQuotePages] = await Promise.all([
      client.listOpportunities({
        status,
        limit: LIST_LIMIT,
        ...(listState.q ? { q: listState.q } : {}),
        ...(listState.cursor ? { cursor: listState.cursor } : {}),
        ...(stage ? { stage } : {}),
        ...commercialQuery,
      }),
      status === 'open'
        ? Promise.all(
            (['draft', 'submitted', 'accepted'] as const).map((quoteStatus) =>
              client
                .listQuotes({ status: quoteStatus, limit: 25, ...commercialQuery })
                .catch(() => ({ items: [] as Awaited<ReturnType<typeof client.listQuotes>>['items'] })),
            ),
          )
        : Promise.resolve([]),
    ]);
    const titled = result.items.filter((item) => !isEngineeringFixtureCopy(item.title));
    const memberLabels = await resolveMemberLabels(
      client,
      titled.map((item) => item.ownerMemberId),
    );
    const partyLabels = await resolvePartyLabels(
      client,
      titled.map((item) => item.partyId),
    );
    const loaded = filterByDemoDataMode(
      titled.filter((item) => !isEngineeringFixtureCopy(partyLabel(partyLabels, item.partyId))),
      dataMode,
      (item) => isDemoDisplayName(partyLabel(partyLabels, item.partyId)),
    );
    const visible = loaded;
    const hasQuery = Boolean(listState.q);
    const controls = readListControls(listState);
    const cursorNav = cursorPageLinks(
      LIST_PATH,
      listState,
      result.meta.nextCursor,
      result.meta.hasMore,
    );
    const stageHref = (href: string | null) => (href ? withExactStage(href, stage) : null);
    const prevHref = stageHref(cursorNav.prevHref);
    const nextHref = stageHref(cursorNav.nextHref);

    return (
      <CommercialPageFrame label={t('pages.oportunidades.title')}>
        <PageHeader
          kicker={t('pages.oportunidades.kicker')}
          title={t('pages.oportunidades.title')}
          description={visible.length === 0 ? undefined : t('pages.oportunidades.description')}
          action={
            evaluation.active ? undefined : (
              <Link href="/oportunidades/nueva" className={commercialPrimaryLinkClass}>
                + Nueva oportunidad
              </Link>
            )
          }
        />

        <div className={`commercial-toolbar ${commercialToolbarClass}`}>
          <CommercialListToolbar
            path={LIST_PATH}
            state={listState}
            searchLabel="Buscar"
            searchPlaceholder="Título"
            hiddenFields={{
              status,
              view: listState.view,
              stage,
              density: controls.density === 'compact' ? undefined : controls.density,
            }}
            clearSearchHref={withExactStage(
              listHref(LIST_PATH, { status, view: listState.view, density: listState.density }, [
                'q',
                'cursor',
                'panel',
              ]),
              stage,
            )}
          />

          <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Filtro de oportunidades">
            {OPPORTUNITY_LIST_STATUSES.map((option) => {
              const active = option === status;
              return (
                <Link
                  key={option}
                  href={withExactStage(
                    listHref(LIST_PATH, { ...listState, status: option }, ['cursor', 'panel']),
                    stage,
                  )}
                  role="tab"
                  aria-selected={active}
                  className={tabClass(active)}
                >
                  {formatOpportunityStatus(option)}
                </Link>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
            {stage
              ? `Etapa exacta: ${presentStage(stage)}. No es un filtro de pipeline.`
              : 'La etapa se muestra como se registró.'}
          </p>
        </div>

        <StaleProjectionBanner freshness={result.freshness} />

        {visible.length === 0 ? (
          <EmptyState
            className="commercial-empty-nest"
            title={
              hasQuery
                ? 'Sin resultados'
                : status === 'open'
                  ? t('states.emptyOportunidades')
                  : 'Sin oportunidades'
            }
            description={emptyDescription(status, hasQuery, stage)}
            example={
              status === 'open' && !hasQuery && !stage
                ? 'Un cliente activo puede no tener oportunidades todavía. Ábralo y registre la primera desde allí.'
                : undefined
            }
            action={
              hasQuery ? (
                <Link
                  href={withExactStage(
                    listHref(LIST_PATH, { status, view: listState.view, density: listState.density }, [
                      'q',
                      'cursor',
                      'panel',
                    ]),
                    stage,
                  )}
                  className={commercialPrimaryLinkClass}
                >
                  Limpiar búsqueda
                </Link>
              ) : (
                <Link href="/clientes" className={commercialPrimaryLinkClass}>
                  {t('states.goToClientes')}
                </Link>
              )
            }
          />
        ) : (
          <PageSection card className={`p-0 ${commercialWorkSurfaceClass}`}>
            <OpportunityOrgList
              items={visible}
              memberLabels={memberLabels}
              partyLabels={partyLabels}
              density={controls.density}
              linkedQuotes={linkedQuotePages.flatMap((page) =>
                page.items.map((item) => ({
                  quoteId: item.quoteId,
                  partyId: item.partyId,
                  opportunityId: item.opportunityId,
                  status: item.status,
                })),
              )}
            />
          </PageSection>
        )}

        {prevHref || nextHref ? (
          <ListPageNav
            from={visible.length > 0 ? 1 : 0}
            to={visible.length}
            total={null}
            page={1}
            pageCount={null}
            prevHref={prevHref}
            nextHref={nextHref}
          />
        ) : null}
      </CommercialPageFrame>
    );
  } catch (err) {
    return (
      <CommercialPageFrame label={t('pages.oportunidades.title')}>
        <PageHeader
          kicker={t('pages.oportunidades.kicker')}
          title={t('pages.oportunidades.title')}
        />
        <QuerySurfaceState error={classifyQueryError(err)} />
      </CommercialPageFrame>
    );
  }
}
