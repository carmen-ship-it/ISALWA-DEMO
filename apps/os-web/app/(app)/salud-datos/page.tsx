import Link from 'next/link';
import { Button, EmptyPanel, PageContainer, PageSection, StatusPill, cx } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { dataHealthWho } from '@/lib/audit/data-health-desk';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import {
  DATA_HEALTH_BOUNDARY,
  DATA_HEALTH_TYPE_LABEL,
  DATA_HEALTH_TYPE_MARKER,
  dataHealthFromSummaries,
  dataHealthPillTone,
} from '@/lib/party/data-health';

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
          <Link href="/clientes" className="inline-flex">
            <Button type="button" variant="primary" size="sm">
              Ir a clientes
            </Button>
          </Link>
        }
      />

      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {DATA_HEALTH_BOUNDARY}
        {partial ? ' La lectura está acotada a los primeros clientes visibles.' : null}
      </p>

      {issues.length === 0 ? (
        <EmptyPanel
          compact
          title="Sin hallazgos en esta lectura"
          description="Cuando falte teléfono, ubicación o responsable en clientes visibles, lo verá aquí."
        />
      ) : (
        <PageSection aria-label="Hallazgos">
          <ul className="space-y-4">
            {issues.map((issue) => (
              <li
                key={issue.id}
                className={cx(
                  'rounded-lg border border-[var(--isalwa-mist)] border-l-4 p-5 shadow-[var(--isalwa-shadow-soft)]',
                  DATA_HEALTH_TYPE_MARKER[issue.type],
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={dataHealthPillTone(issue.type)}>
                    {DATA_HEALTH_TYPE_LABEL[issue.type]}
                  </StatusPill>
                  <h2 className="text-sm font-semibold text-[var(--isalwa-kiln)]">{issue.title}</h2>
                </div>
                <dl className="mt-4 grid gap-3 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--isalwa-kiln)]">
                      Tipo
                    </dt>
                    <dd className="mt-1 leading-relaxed">{DATA_HEALTH_TYPE_LABEL[issue.type]}</dd>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--isalwa-kiln)]">
                      Qué
                    </dt>
                    <dd className="mt-1 leading-relaxed">{issue.what}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--isalwa-kiln)]">
                      Por qué
                    </dt>
                    <dd className="mt-1 leading-relaxed">{issue.why}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--isalwa-kiln)]">
                      Quién
                    </dt>
                    <dd className="mt-1 leading-relaxed">{dataHealthWho(issue)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--isalwa-kiln)]">
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
