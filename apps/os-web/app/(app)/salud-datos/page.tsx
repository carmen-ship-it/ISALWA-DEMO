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
import { dataHealthCta } from '@/lib/party/data-health-cta';

export default async function SaludDatosPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const result = await client.searchParties({ status: 'active', limit: 25 });
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

      <p className="mb-4 max-w-2xl rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-sky)] bg-[color-mix(in_srgb,var(--isalwa-sky)_45%,white)] px-3 py-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
        {DATA_HEALTH_BOUNDARY}
        {' La lectura examina como máximo 25 clientes activos visibles — no implica cobertura de toda la cartera.'}
      </p>

      {issues.length === 0 ? (
        <EmptyPanel
          compact
          title="Sin hallazgos en esta lectura"
          description="Cuando falte teléfono, ubicación o responsable en clientes visibles, lo verá aquí."
        />
      ) : (
        <PageSection aria-label="Hallazgos">
          <ul className="space-y-3">
            {issues.map((issue) => {
              const cta = dataHealthCta(issue);
              return (
              <li
                key={issue.id}
                className={cx(
                  'rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] border-l-4 px-3 py-2.5',
                  DATA_HEALTH_TYPE_MARKER[issue.type],
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={dataHealthPillTone(issue.type)}>
                    {DATA_HEALTH_TYPE_LABEL[issue.type]}
                  </StatusPill>
                  <h2 className="line-clamp-2 text-[0.9375rem] font-semibold leading-5 text-[var(--isalwa-kiln)]">{issue.title}</h2>
                </div>
                <dl className="mt-2 grid gap-2 text-xs text-[var(--isalwa-slate)] sm:grid-cols-2 lg:grid-cols-3">
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
                <div className="mt-4">
                  <Link href={cta.href} className="inline-flex">
                    <Button type="button" variant="secondary" size="sm">
                      {cta.label}
                    </Button>
                  </Link>
                </div>
              </li>
            );
            })}
          </ul>
        </PageSection>
      )}
    </PageContainer>
  );
}
