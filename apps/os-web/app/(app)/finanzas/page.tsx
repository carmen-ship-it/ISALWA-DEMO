import { PageContainer, StatusPill } from '@isalwa/ui';
import { FinanceOperationalDesk } from '@/components/finance/finance-operational-desk';
import { PageHeader } from '@/components/shell/page-header';
import { OsApiError } from '@/lib/api/os-api-errors';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { FINANCE_DESK_COPY, resolveFinancePageAccess } from '@/lib/finance';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';

/**
 * Operational finance desk for Contabilidad.
 * Unlocks with finance.operational.record only.
 * Product capability `finance` remains LOCKED (no official ledger / Ingresos).
 */
export default async function FinanzasPage() {
  const access = await loadFinanceAccess();

  return (
    <PageContainer label={FINANCE_DESK_COPY.title}>
      <PageHeader
        kicker={FINANCE_DESK_COPY.kicker}
        title={FINANCE_DESK_COPY.title}
        description={FINANCE_DESK_COPY.intro}
        action={<StatusPill tone="manual">Dato manual</StatusPill>}
      />
      {access.status === 'ready' ? (
        <FinanceOperationalDesk
          status="ready"
          organizationId={access.organizationId}
          memberId={access.memberId}
          actorLabel={access.actorLabel}
          grantedScopes={access.grantedScopes}
        />
      ) : (
        <FinanceOperationalDesk status="denied" reason={access.reason} />
      )}
    </PageContainer>
  );
}

async function loadFinanceAccess() {
  try {
    const auth = await getServerOsAuthContext();
    if (!auth) {
      return resolveFinancePageAccess({ session: null, grantedScopes: null });
    }
    const client = createOsApiClient(auth);
    const session = await client.getAuthenticatedSession();
    const grantedScopes = await loadActorRoleKeys(client);
    return resolveFinancePageAccess({
      session: {
        organizationId: session.organizationId,
        memberId: session.memberId,
        accessStatus: session.accessStatus,
        actorLabel: 'Contabilidad',
        grantedScopes,
      },
      grantedScopes,
    });
  } catch (error) {
    if (error instanceof OsApiError && (error.kind === 'unauthorized' || error.kind === 'forbidden')) {
      return resolveFinancePageAccess({ session: null, grantedScopes: null });
    }
    return resolveFinancePageAccess({ session: null, grantedScopes: null });
  }
}
