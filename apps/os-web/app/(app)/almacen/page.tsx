import { PageContainer, StatusPill } from '@isalwa/ui';
import { WarehouseDesk } from '@/components/warehouse/warehouse-desk';
import { PageHeader } from '@/components/shell/page-header';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { WAREHOUSE_TASK_COPY, resolveWarehousePageAccess } from '@/lib/warehouse';

export default async function AlmacenPage() {
  const access = await loadAlmacenAccess();

  return (
    <PageContainer label={WAREHOUSE_TASK_COPY.title}>
      <PageHeader
        kicker={WAREHOUSE_TASK_COPY.kicker}
        title={WAREHOUSE_TASK_COPY.title}
        description={WAREHOUSE_TASK_COPY.intro}
        action={
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="manual">{WAREHOUSE_TASK_COPY.notOfficialStock}</StatusPill>
            <StatusPill tone="neutral">No es entrega</StatusPill>
          </div>
        }
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
    // Grants come only from GET /session/authorization. A missing list stays
    // permission_unconfirmed — never treat session/me as a grant source.
    const context = await loadMemberCapabilities();
    if (!context) {
      return resolveWarehousePageAccess({ session: null, grantedScopes: null });
    }
    return resolveWarehousePageAccess({
      session: {
        organizationId: context.organizationId,
        memberId: context.memberId,
        accessStatus: context.accessStatus,
        actorLabel: null,
        grantedScopes: context.grantedScopes,
      },
      grantedScopes: context.grantedScopes,
      facts: { receipts: null, pedidos: [] },
    });
  } catch {
    return { status: 'error' as const };
  }
}
