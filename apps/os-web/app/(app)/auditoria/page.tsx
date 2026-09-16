import Link from 'next/link';
import { EmptyState, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { AccessDeniedState } from '@/components/states/app-states';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { AUDIT_READ_BOUNDARY } from '@/lib/audit/humanize';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';
import { mayOpenSystemControls } from '@/lib/roles/system-controls';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';

type AuditoriaPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function queryString(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const raw = params[key];
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw[0];
  return undefined;
}

export default async function AuditoriaPage({ searchParams }: AuditoriaPageProps) {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const params = await searchParams;
  const peopleAdmin = await client.probeAdminAccess();
  const grantedScopes = await loadActorRoleKeys(client);
  const systemAdmin = mayOpenSystemControls(grantedScopes);

  if (!peopleAdmin && !systemAdmin) {
    return (
      <PageContainer label="Auditoría" className="flex min-h-[50vh] items-center justify-center">
        <AccessDeniedState />
      </PageContainer>
    );
  }

  const limit = queryString(params, 'limit') ?? '50';
  const result = await client.listAudit({ limit });
  const actorIds = result.items.map((item) => item.actorMemberId).filter((id): id is string => Boolean(id));
  const memberLabels = actorIds.length > 0 ? await resolveMemberLabels(client, actorIds) : new Map();

  return (
    <PageContainer label="Auditoría">
      <PageHeader
        kicker="Administración"
        title="Auditoría"
        description="Quién cambió qué y cuándo, sin exportar ni editar desde aquí."
        action={<StatusPill tone="neutral">Solo lectura</StatusPill>}
      />

      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {AUDIT_READ_BOUNDARY}
        {!peopleAdmin && systemAdmin ? (
          <>
            {' '}
            Acceso vía{' '}
            <Link href="/sistema" className="font-medium text-[var(--isalwa-glaze)] hover:underline">
              Controles del sistema
            </Link>
            .
          </>
        ) : null}
      </p>

      {result.items.length === 0 ? (
        <EmptyState
          title="Sin registros en esta ventana"
          description="Cuando existan cambios auditados en su organización, aparecerán aquí."
        />
      ) : (
        <PageSection aria-label="Registros de auditoría">
          <ul className="divide-y divide-[var(--isalwa-mist)]">
            {result.items.map((item) => {
              const actorLabel = item.actorMemberId
                ? memberLabel(memberLabels, item.actorMemberId)
                : 'Sistema';
              return (
                <li key={item.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{item.actionLabel}</p>
                    <time className="text-xs text-[var(--isalwa-slate)]" dateTime={item.occurredAt}>
                      {new Date(item.occurredAt).toLocaleString('es-BO', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                    {item.resourceLabel} · {actorLabel}
                  </p>
                  {(item.hasBefore || item.hasAfter) && (
                    <p className="mt-1 text-xs text-[var(--isalwa-slate)]">
                      {item.hasBefore && item.hasAfter
                        ? 'Incluye estado anterior y posterior'
                        : item.hasAfter
                          ? 'Incluye estado posterior'
                          : 'Incluye estado anterior'}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </PageSection>
      )}
    </PageContainer>
  );
}
