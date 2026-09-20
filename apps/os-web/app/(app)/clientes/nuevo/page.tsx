import Link from 'next/link';
import { PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
import { CustomerCreateForm } from '@/components/party/customer-create-form';
import { CustomerSearchFirstForm } from '@/components/party/customer-search-first-form';
import { PartyList } from '@/components/party/party-list';
import { PageHeader } from '@/components/shell/page-header';
import { PermissionDeniedSurface } from '@/components/states/permission-denied-surface';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { actorCanMutateMasterData } from '@/lib/party/master-data-access';
import { classifyQueryError } from '@/lib/work/query-errors';

type NewCustomerPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function NewCustomerPage({ searchParams }: NewCustomerPageProps) {
  const { q } = await searchParams;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const canCreate = await actorCanMutateMasterData(client);
  const query = q?.trim() ?? '';

  if (!canCreate) {
    return (
      <PageContainer label="Agregar cliente">
        <PermissionDeniedSurface
          title="No puede realizar esta acción"
          kicker="Relaciones"
          explanation="Su acceso actual permite consultar clientes, pero no crear uno."
          backHref="/clientes"
          backLabel="Volver a clientes"
        />
      </PageContainer>
    );
  }

  let matches: Awaited<ReturnType<typeof client.searchParties>> | null = null;
  if (query.length >= 2) {
    try {
      matches = await client.searchParties({ q: query, limit: 25 });
    } catch (err) {
      return (
        <PageContainer label="Agregar cliente">
          <PageHeader
            kicker="Relaciones"
            title="Agregar cliente"
            action={
              <Link href="/clientes" className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
                Volver
              </Link>
            }
          />
          <QuerySurfaceState error={classifyQueryError(err)} />
        </PageContainer>
      );
    }
  }

  return (
    <PageContainer label="Agregar cliente">
      <PageHeader
        kicker="Relaciones"
        title="Agregar cliente"
        description="Busque primero. Si el cliente ya existe, ábralo. Crear uno nuevo no fusiona registros."
        action={
          <Link href="/clientes" className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
            Volver
          </Link>
        }
      />

      <CustomerSearchFirstForm initialQuery={query} />

      {query.length > 0 && query.length < 2 ? (
        <p className="mt-6 text-sm text-[var(--isalwa-slate)]">Escriba al menos 2 caracteres para buscar.</p>
      ) : null}

      {matches ? (
        <div className="mt-8 space-y-6">
          <StaleProjectionBanner freshness={matches.freshness} />
          <PageSection card className="p-6">
            <SectionHeader title={matches.items.length === 0 ? 'Sin coincidencias' : 'Coincidencias'} />
            <p className="mb-4 text-sm text-[var(--isalwa-slate)]">
              {matches.items.length === 0
                ? 'No encontramos un registro con esa búsqueda.'
                : 'Si uno de estos es el mismo cliente, ábralo. No se fusionará en silencio.'}
            </p>
            {matches.items.length > 0 ? <PartyList items={matches.items} /> : null}
          </PageSection>

          <PageSection card className="p-6">
            <SectionHeader title="Cliente nuevo" />
            <div className="mt-4">
              <CustomerCreateForm
                searchedQuery={query}
                hasMoreMatches={matches.meta.hasMore}
                matchCount={matches.items.length}
              />
            </div>
          </PageSection>
        </div>
      ) : null}
    </PageContainer>
  );
}
