import Link from 'next/link';
import { ListRow, StatusPill } from '@isalwa/ui';
import type { OrderSummaryReadModel } from '@isalwa/os-contracts';
import {
  formatOrderStatus,
  formatTimestamp,
  statusTone,
} from '@/lib/commercial/labels';
import { formatCentavos } from '@/lib/commercial/money';
import { orderHref } from '@/lib/commercial/navigation';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';

type OrderListProps = {
  partyId: string;
  items: OrderSummaryReadModel[];
  memberLabels: MemberLabelMap;
};

export function OrderList({ partyId, items, memberLabels }: OrderListProps) {
  return (
    <>
      <p className="mb-4 text-sm text-[var(--isalwa-slate)]">
        Registro comercial del pedido. Entrega, inventario y pagos no se muestran en esta vista.
      </p>
      <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Pedidos">
        {items.map((item) => (
          <ListRow key={item.orderId} as="li" className="px-1 py-1">
            <div className="rounded-[var(--isalwa-radius-control)] px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={orderHref(partyId, item.orderId)}
                    className="isalwa-t-fast font-medium text-[var(--isalwa-kiln)] outline-none hover:text-[var(--isalwa-glaze-deep)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                  >
                    {item.orderNumber}
                  </Link>
                  <dl className="mt-3 grid gap-1 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                    <div>
                      <dt className="sr-only">Total</dt>
                      <dd>Total: {formatCentavos(item.totalCentavos, item.currency)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Responsable</dt>
                      <dd>Responsable: {memberLabel(memberLabels, item.ownerMemberId)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Cotización origen</dt>
                      <dd>Cotización origen vinculada</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Creado</dt>
                      <dd>Creado: {formatTimestamp(item.createdAt)}</dd>
                    </div>
                    {item.cancelledAt ? (
                      <div>
                        <dt className="sr-only">Cancelado</dt>
                        <dd>Cancelado: {formatTimestamp(item.cancelledAt)}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                <StatusPill tone={statusTone(item.status)}>
                  {formatOrderStatus(item.status)}
                </StatusPill>
              </div>
            </div>
          </ListRow>
        ))}
      </ul>
    </>
  );
}
