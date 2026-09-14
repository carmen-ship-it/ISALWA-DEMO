import Link from 'next/link';
import { PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { DATA_HEALTH_BOUNDARY, dataHealthFromSummaries, mapCoverage } from '@/lib/party/data-health';
import { partyHref } from '@/lib/party/navigation';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

export default async function MapaPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const result = await client.searchParties({ status: 'active', limit: 100 });
  const coverage = mapCoverage(result.items);
  const withCoordinates = result.items.filter((item) => item.hasCoordinates === true);
  const issues = dataHealthFromSummaries(result.items);
  const partial = result.meta.hasMore;

  return (
    <PageContainer label="Mapa">
      <PageHeader
        kicker="Ubicación"
        title="Mapa"
        description="Solo coordenadas ya registradas. Un enlace de Maps no coloca al cliente en el mapa y no se resuelve un enlace compartido."
        action={
          <Link href="/clientes" className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
            Clientes
          </Link>
        }
      />

      <PageSection data-tour={TOUR_TARGET.mapCoverage}>
        <StatusPill tone="info">Sin proveedor de mapa</StatusPill>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {coverage.sentence ?? 'La lista aún no trae hechos de ubicación.'}
          {partial ? ' Esta lectura no incluye todos los clientes.' : null}{' '}
          {coverage.limit}{' '}
          {coverage.provenanceOnly > 0
            ? `${coverage.provenanceOnly} ${coverage.provenanceOnly === 1 ? 'cliente tiene solo un enlace y no se coloca' : 'clientes tienen solo un enlace y no se colocan'} en el mapa. `
            : null}
          El mapa de teselas se conectará cuando haya un proveedor. No se inventan coordenadas ni un mapa de calor.
        </p>
      </PageSection>

      <PageSection className="mt-8">
        <h2 className="text-sm font-medium text-[var(--isalwa-kiln)]">Disponibles en mapa</h2>
        {withCoordinates.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--isalwa-slate)]">Ningún cliente visible tiene coordenadas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--isalwa-mist)]">
            {withCoordinates.map((item) => (
              <li key={item.partyId} className="py-3">
                <Link href={partyHref(item.partyId)} className="text-sm font-medium text-[var(--isalwa-kiln)]">
                  {item.displayName}
                </Link>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">Ubicación disponible</p>
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      <PageSection className="mt-8" aria-label="Salud de datos">
        <h2 className="text-sm font-medium text-[var(--isalwa-kiln)]">Salud de datos</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {DATA_HEALTH_BOUNDARY}
          {partial ? ' No incluye todos los clientes.' : null}
        </p>
        {coverage.sentence === null ? (
          <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
            La lista aún no trae hechos para revisar salud de datos.
          </p>
        ) : issues.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
            No hay observaciones en los clientes visibles.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {issues.map((issue) => (
              <li key={issue.id} className="border-t border-[var(--isalwa-mist)] pt-4">
                <StatusPill
                  tone={
                    issue.id.startsWith('shared-provenance') || issue.id.startsWith('shared-phone')
                      ? 'manual'
                      : 'warning'
                  }
                >
                  {issue.title}
                </StatusPill>
                <p className="mt-2 text-sm text-[var(--isalwa-kiln)]">{issue.what}</p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{issue.why}</p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{issue.action}</p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{issue.boundary}</p>
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </PageContainer>
  );
}
