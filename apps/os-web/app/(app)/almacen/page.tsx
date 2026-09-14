import { PageContainer } from '@isalwa/ui';
import { WarehouseDesk } from '@/components/warehouse/warehouse-desk';
import { PageHeader } from '@/components/shell/page-header';
import { OsApiError } from '@/lib/api/os-api-errors';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { WAREHOUSE_TASK_COPY, resolveWarehousePageAccess } from '@/lib/warehouse';

export default async function AlmacenPage() {
  const access = await loadAlmacenAccess();

  return (
    <PageContainer label={WAREHOUSE_TASK_COPY.title}>
      <PageHeader
        kicker={WAREHOUSE_TASK_COPY.kicker}
        title={WAREHOUSE_TASK_COPY.title}
        description={WAREHOUSE_TASK_COPY.intro}
      />
      <WarehouseDesk
        status={access.status === 'error' ? 'error' : access.status === 'ready' ? 'ready' : 'denied'}
        denial={access.status === 'denied' ? access.reason : null}
        view={access.status === 'ready' ? access.view : null}
        canAllocate={access.status === 'ready' ? access.canAllocate : false}
      />
    </PageContainer>
  );
}

async function loadAlmacenAccess() {
  try {
    const auth = await getServerOsAuthContext();
    if (!auth) {
      return resolveWarehousePageAccess({ session: null, grantedScopes: null });
    }
    const client = createOsApiClient(auth);
    const session = await client.getAuthenticatedSession();
    return resolveWarehousePageAccess({
      session: {
        organizationId: session.organizationId,
        memberId: session.memberId,
        accessStatus: session.accessStatus,
        actorLabel: null,
        grantedScopes: null,
      },
      grantedScopes: null,
      facts: { receipts: null, pedidos: [] },
    });
  } catch (error) {
    if (error instanceof OsApiError && (error.kind === 'unauthorized' || error.kind === 'forbidden')) {
      return resolveWarehousePageAccess({ session: null, grantedScopes: null });
    }
    return { status: 'error' as const };
  }
}
