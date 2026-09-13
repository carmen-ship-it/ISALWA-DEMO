import Link from 'next/link';
import { Button, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import {
  formatOrderStatus,
  formatTimestamp,
  statusTone,
} from '@/lib/commercial/labels';
import { formatCentavos } from '@/lib/commercial/money';
import { partyHref } from '@/lib/party/navigation';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { classifyQueryError } from '@/lib/work/query-errors';

type OrderDetailPageProps = {
  params: Promise<{ partyId: string; orderId: string }>;
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { partyId, orderId } = await params;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const { order, freshness } = await client.getOrder(orderId);
    const memberLabels = await resolveMemberLabels(client, [order.ownerMemberId]);

    return (
      <PageContainer label={order.orderNumber}>
        <PageHeader
          kicker="Pedido"
          title={order.orderNumber}
          action={
            <Link href={partyHref(partyId)}>
              <Button type="button" variant="secondary">
                Volver al cliente
              </Button>
            </Link>
          }
        />

        <StaleProjectionBanner freshness={freshness} />

        <PageSection card className="p-6">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={statusTone(order.status)}>
              {formatOrderStatus(order.status)}
            </StatusPill>
          </div>

          <p className="mt-4 text-sm text-[var(--isalwa-slate)]">
            Registro comercial del pedido. Entrega, inventario y pagos no se muestran en esta vista.
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="isalwa-section-label">Total</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">
                {formatCentavos(order.totalCentavos, order.currency)}
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Responsable</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">
                {memberLabel(memberLabels, order.ownerMemberId)}
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Creado</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">{formatTimestamp(order.createdAt)}</dd>
            </div>
            {order.cancelledAt ? (
              <div>
                <dt className="isalwa-section-label">Cancelado</dt>
                <dd className="mt-1 text-[var(--isalwa-kiln)]">
                  {formatTimestamp(order.cancelledAt)}
                </dd>
              </div>
            ) : null}
          </dl>
        </PageSection>
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return (
        <PageContainer label="Pedido">
          <QuerySurfaceState
            error={{ kind: 'unknown', message: 'No se encontró este pedido.' }}
          />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Pedido">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
