import Link from 'next/link';
import { PageContainer } from '@isalwa/ui';
import { OpportunityCreateForm } from '@/components/commercial/opportunity-create-form';
import { PageHeader } from '@/components/shell/page-header';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { filterByDemoDataMode, isDemoDisplayName } from '@/lib/demo/owner-demo-identity';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';
import { withExplicitDataMode } from '@/lib/demo/preserve-data-mode';
import { presentHumanCopy } from '@/lib/demo/human-facing-copy';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';

type PageProps = {
  searchParams: Promise<{ q?: string; cliente?: string; datos?: string }>;
};

export default async function NuevaOportunidadDesdeListaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const evaluation = await getEvaluationProjection();
  const auth = await getServerOsAuthContext();
  if (!auth) return null;
  if (evaluation.active) {
    return (
      <PageContainer label="Nueva oportunidad">
        <PageHeader kicker="Oportunidad" title="Nueva oportunidad" description="Vista de evaluación: solo lectura." />
      </PageContainer>
    );
  }

  const client = createOsApiClient(auth);
  const cliente = params.cliente?.trim() ?? '';
  const query = params.q?.trim() ?? '';
  const dataMode = await resolveDemoDataMode(params);

  if (cliente) {
    return (
      <PageContainer label="Nueva oportunidad">
        <PageHeader
          kicker="Oportunidad"
          title="Nueva oportunidad"
          description="El cliente ya existe. El título es el nombre comercial de la oportunidad."
          action={
            <Link
              href={withExplicitDataMode('/oportunidades/nueva', dataMode)}
              className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
            >
              Cambiar cliente
            </Link>
          }
        />
        <OpportunityCreateForm partyId={cliente} />
      </PageContainer>
    );
  }

  let matches: Array<{ partyId: string; displayName: string }> = [];
  if (query.length >= 2) {
    try {
      const result = await client.searchParties({ q: query, status: 'active', limit: 25 });
      matches = filterByDemoDataMode(
        result.items.filter((party) => !isEngineeringFixtureCopy(party.displayName)),
        dataMode,
        (party) => isDemoDisplayName(party.displayName),
      ).map((party) => ({
        partyId: party.partyId,
        displayName: presentHumanCopy(party.displayName) || party.displayName,
      }));
    } catch {
      matches = [];
    }
  }

  return (
    <PageContainer label="Nueva oportunidad">
      <PageHeader
        kicker="Oportunidad"
        title="Nueva oportunidad"
        description="Elija un cliente existente. No se crea un cliente desde aquí."
        action={
          <Link href={withExplicitDataMode('/clientes/nuevo', dataMode)} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
            Crear cliente
          </Link>
        }
      />
      <form method="get" action="/oportunidades/nueva" className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="datos" value={dataMode} />
        <label className="min-w-0 flex-1 text-sm text-[var(--isalwa-kiln)]">
          Cliente
          <input
            name="q"
            defaultValue={query}
            required
            minLength={2}
            className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
            placeholder="Buscar por nombre"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] bg-[var(--isalwa-kiln)] px-4 text-sm font-medium text-white"
        >
          Buscar
        </button>
      </form>
      {query.length >= 2 && matches.length === 0 ? (
        <p className="text-sm text-[var(--isalwa-kiln)]">
          No encontramos ese cliente.{' '}
          <Link href={withExplicitDataMode('/clientes/nuevo', dataMode)} className="font-medium text-[var(--isalwa-glaze)] underline">
            Crear cliente
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-[var(--isalwa-mist)] rounded-[var(--isalwa-radius-card)] border border-[var(--isalwa-mist)] bg-white">
          {matches.map((party) => (
            <li key={party.partyId}>
              <Link
                href={withExplicitDataMode(
                  `/oportunidades/nueva?cliente=${encodeURIComponent(party.partyId)}`,
                  dataMode,
                )}
                className="block px-4 py-3 text-sm font-medium text-[var(--isalwa-kiln)] hover:bg-[var(--isalwa-porcelain)]"
              >
                {party.displayName}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm text-[var(--isalwa-slate)]">
        Si el cliente no está en la lista,{' '}
        <Link href={withExplicitDataMode('/clientes/nuevo', dataMode)} className="font-medium text-[var(--isalwa-glaze)] underline">
          Crear cliente
        </Link>
        .
      </p>
    </PageContainer>
  );
}
