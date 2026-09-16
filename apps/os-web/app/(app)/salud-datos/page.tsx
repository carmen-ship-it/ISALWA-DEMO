import Link from 'next/link';
import { EmptyState, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { dataHealthWho } from '@/lib/audit/data-health-desk';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { DATA_HEALTH_BOUNDARY, dataHealthFromSummaries } from '@/lib/party/data-health';

export default async function SaludDatosPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const result = await client.searchParties({ status: 'active', limit: 100 });
  const issues = dataHealthFromSummaries(result.items);
  const partial = result.meta.hasMore;

  return (
    <PageContainer label="Salud de datos">
      <PageHeader
        kicker="Comercial"
        title="Salud de datos"
        description="Hallazgos sobre clientes visibles. No corrige ni fusiona desde aquí."
        action={
          <Link href="/clientes" className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
            Ir a clientes
          </Link>
        }
      />

      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {DATA_HEALTH_BOUNDARY}
        {partial ? ' La lectura está acotada a los primeros clientes visibles.' : null}
      </p>

      {issues.length === 0 ? (
        <EmptyState
          title="Sin hallazgos en esta lectura"
          description="Cuando falte teléfono, ubicación o responsable en clientes visibles, lo verá aquí."
        />
      ) : (
        <PageSection aria-label="Hallazgos">
          <ul className="space-y-6">
            {issues.map((issue) => (
              <li
                key={issue.id}
                className="rounded-lg border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_50%,white)] p-5 shadow-[var(--isalwa-shadow-soft)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-medium text-[var(--isalwa-kiln)]">{issue.title}</h2>
                  <StatusPill tone="warning">Hallazgo</StatusPill>
                </div>
                <dl className="mt-4 grid gap-3 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-[var(--isalwa-slate)]">
                      Qué
                    </dt>
                    <dd className="mt-1 leading-relaxed">{issue.what}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-[var(--isalwa-slate)]">
                      Por qué importa
                    </dt>
                    <dd className="mt-1 leading-relaxed">{issue.why}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-[var(--isalwa-slate)]">
                      Quién
                    </dt>
                    <dd className="mt-1 leading-relaxed">{dataHealthWho(issue)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-[var(--isalwa-slate)]">
                      Acción
                    </dt>
                    <dd className="mt-1 leading-relaxed">{issue.action}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs leading-relaxed text-[var(--isalwa-slate)]">{issue.boundary}</p>
              </li>
            ))}
          </ul>
        </PageSection>
      )}
    </PageContainer>
  );
}
