import Link from 'next/link';
import { Button, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { AdminSubNav } from '@/components/admin/admin-sub-nav';
import { MemberAdminActionsPanel } from '@/components/admin/member-admin-actions-panel';
import { PageHeader } from '@/components/shell/page-header';
import { AccessDeniedState } from '@/components/states/app-states';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { getActorMemberId } from '@/lib/workforce/actions';
import { loadMemberAdminOptions } from '@/lib/workforce/admin-options';
import {
  accessStatusExplanation,
  accessStatusTone,
  formatAccessStatus,
  formatEmploymentStatus,
  formatRoleKey,
  formatRoleKeys,
  splitRoleKeys,
  formatTimestamp,
  memberDisplayName,
} from '@/lib/workforce/labels';
import { memberAdminVisibility } from '@/lib/workforce/lifecycle-ui';
import { buildDirectoryLabelMap, directoryMemberLabel } from '@/lib/workforce/member-labels';
import { equipoHref, memberHref } from '@/lib/workforce/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';

type MemberDetailPageProps = {
  params: Promise<{ memberId: string }>;
};

export default async function MemberDetailPage({ params }: MemberDetailPageProps) {
  const { memberId } = await params;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const allowed = await client.probeAdminAccess();
    if (!allowed) {
      return (
        <PageContainer label="Empleado" className="flex min-h-[50vh] items-center justify-center">
          <AccessDeniedState />
        </PageContainer>
      );
    }

    const [{ summary }, actorMemberId, adminOptions] = await Promise.all([
      client.getMember(memberId),
      getActorMemberId(),
      loadMemberAdminOptions(client, memberId),
    ]);

    const roles = splitRoleKeys(summary.roleKeys);
    const name = memberDisplayName(summary.displayName, summary.givenName, summary.familyName);
    const lifecycleNote = accessStatusExplanation(summary.accessStatus, summary.employmentStatus);
    const visibility = memberAdminVisibility(summary, actorMemberId);

    let managerLabel = '—';
    if (summary.managerMemberId) {
      if (summary.managerMemberId === summary.memberId) {
        managerLabel = name;
      } else {
        try {
          const manager = await client.getMember(summary.managerMemberId);
          managerLabel = memberDisplayName(
            manager.summary.displayName,
            manager.summary.givenName,
            manager.summary.familyName,
          );
        } catch {
          managerLabel = 'Otro miembro';
        }
      }
    }

    const selfMap = buildDirectoryLabelMap([summary]);
    const showAdminActions =
      visibility.organization ||
      visibility.suspend ||
      visibility.reactivate ||
      visibility.terminate ||
      visibility.delegation ||
      visibility.requestEmailChange;

    return (
      <PageContainer label={name}>
        <PageHeader
          kicker="Equipo"
          title={name}
          action={
            <Link href={equipoHref()}>
              <Button type="button" variant="secondary">
                Volver al equipo
              </Button>
            </Link>
          }
        />

        <AdminSubNav />

        <PageSection card className="mt-10 p-8">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={accessStatusTone(summary.accessStatus)}>
              {formatAccessStatus(summary.accessStatus)}
            </StatusPill>
            <StatusPill tone="neutral">{formatEmploymentStatus(summary.employmentStatus)}</StatusPill>
          </div>

          {summary.accessStatus === 'invited' && lifecycleNote ? (
            <div className="mt-8 max-w-2xl border-t border-[var(--isalwa-mist)] pt-8">
              <p className="isalwa-section-label">Siguiente paso</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">{lifecycleNote}</p>
            </div>
          ) : lifecycleNote ? (
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{lifecycleNote}</p>
          ) : null}

          <dl className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="isalwa-section-label">Correo</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">{summary.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Rol principal</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatRoleKeys(roles.primary)}</dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Permisos adicionales</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {roles.additional.length > 0
                  ? roles.additional.map((key) => (
                      <span key={key} className="block">
                        {formatRoleKey(key)}
                      </span>
                    ))
                  : 'Sin permisos adicionales'}
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Departamento</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">{summary.departmentName ?? '—'}</dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Responsable</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {summary.managerMemberId && summary.managerMemberId !== summary.memberId ? (
                  <Link
                    href={memberHref(summary.managerMemberId)}
                    className="text-[var(--isalwa-glaze)] hover:underline"
                  >
                    {managerLabel}
                  </Link>
                ) : (
                  directoryMemberLabel(selfMap, summary.managerMemberId)
                )}
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Inicio de relación</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {formatTimestamp(summary.employmentStartedAt) ?? '—'}
              </dd>
            </div>
            {summary.employmentEndedAt ? (
              <div>
                <dt className="isalwa-section-label">Fin de relación</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">
                  {formatTimestamp(summary.employmentEndedAt)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="isalwa-section-label">Delegaciones activas</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">{summary.activeDelegationCount}</dd>
            </div>
          </dl>
        </PageSection>

        {showAdminActions ? (
          <div className="mt-8">
            <MemberAdminActionsPanel
              summary={summary}
              visibility={visibility}
              departments={adminOptions.departments}
              roles={adminOptions.roles}
              managers={adminOptions.managers}
              delegates={adminOptions.delegates}
            />
          </div>
        ) : null}
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return (
        <PageContainer label="Empleado">
          <QuerySurfaceState
            error={{ kind: 'unknown', message: 'No se encontró este empleado.' }}
          />
        </PageContainer>
      );
    }
    if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
      return (
        <PageContainer label="Empleado" className="flex min-h-[50vh] items-center justify-center">
          <AccessDeniedState />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Empleado">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
