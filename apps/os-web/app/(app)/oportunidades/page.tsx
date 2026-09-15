import Link from 'next/link';
import { EmptyState, PageSection, SearchField, cx } from '@isalwa/ui';
import { CommercialPageFrame } from '@/components/commercial/commercial-page-frame';
import { OpportunityOrgList } from '@/components/commercial/opportunity-org-list';
import {
  commercialPrimaryButtonClass,
  commercialPrimaryLinkClass,
  commercialToolbarClass,
  commercialWorkSurfaceClass,
} from '@/components/commercial/commercial-surfaces';
import '@/components/commercial/commercial-surfaces.css';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { formatOpportunityStatus, formatStage } from '@/lib/commercial/labels';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { t } from '@/lib/i18n/es';
import { listHref, parseListQuery, type ListQueryState } from '@/lib/lists/url-state';
import { resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';

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
    return `No hay oportunidades en etapa exacta «${formatStage(stage)}». La etapa no es un pipeline.`;
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
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const result = await client.listOpportunities({
      status,
      limit: LIST_LIMIT,
      ...(listState.q ? { q: listState.q } : {}),
      ...(listState.cursor ? { cursor: listState.cursor } : {}),
      ...(stage ? { stage } : {}),
    });
    const titled = result.items.filter((item) => !isEngineeringFixtureCopy(item.title));
    const memberLabels = await resolveMemberLabels(
      client,
      titled.map((item) => item.ownerMemberId),
    );
    const partyLabels = await resolvePartyLabels(
      client,
      titled.map((item) => item.partyId),
    );
    const visible = titled.filter(
      (item) => !isEngineeringFixtureCopy(partyLabel(partyLabels, item.partyId)),
    );
    const hasQuery = Boolean(listState.q);
    const nextHref =
      result.meta.hasMore && result.meta.nextCursor
        ? withExactStage(
            listHref(LIST_PATH, { ...listState, cursor: result.meta.nextCursor }, ['panel']),
            stage,
          )
        : null;

    return (
      <CommercialPageFrame label={t('pages.oportunidades.title')}>
        <PageHeader
          kicker={t('pages.oportunidades.kicker')}
          title={t('pages.oportunidades.title')}
          description={visible.length === 0 ? undefined : t('pages.oportunidades.description')}
        />

        <div className={`commercial-toolbar ${commercialToolbarClass}`}>
          <form
            key={`${status}:${listState.q ?? ''}:${listState.view ?? ''}:${stage ?? ''}`}
            method="get"
            action={LIST_PATH}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <input type="hidden" name="status" value={status} />
            {listState.view ? <input type="hidden" name="view" value={listState.view} /> : null}
            {stage ? <input type="hidden" name="stage" value={stage} /> : null}
            <div className="min-w-0 flex-1">
              <label
                htmlFor="oportunidades-q"
                className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]"
              >
                Buscar
              </label>
              <SearchField
                id="oportunidades-q"
                name="q"
                defaultValue={listState.q ?? ''}
                placeholder="Título"
                autoComplete="off"
              />
            </div>
            <button type="submit" className={commercialPrimaryButtonClass}>
              Buscar
            </button>
            {hasQuery ? (
              <Link
                href={withExactStage(
                  listHref(LIST_PATH, { status, view: listState.view }, ['q', 'cursor', 'panel']),
                  stage,
                )}
                className="inline-flex h-10 shrink-0 items-center text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
              >
                Limpiar
              </Link>
            ) : null}
          </form>

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
              ? `Etapa exacta: ${formatStage(stage)}. No es un filtro de pipeline.`
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
              <Link href="/clientes" className={commercialPrimaryLinkClass}>
                {t('states.goToClientes')}
              </Link>
            }
          />
        ) : (
          <PageSection card className={`p-0 ${commercialWorkSurfaceClass}`}>
            <OpportunityOrgList
              items={visible}
              memberLabels={memberLabels}
              partyLabels={partyLabels}
            />
          </PageSection>
        )}

        {nextHref ? (
          <div className="mt-6 flex justify-center">
            <Link
              href={nextHref}
              className="isalwa-t-fast inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-5 text-sm font-medium text-[var(--isalwa-kiln)] hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            >
              Cargar más
            </Link>
          </div>
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
