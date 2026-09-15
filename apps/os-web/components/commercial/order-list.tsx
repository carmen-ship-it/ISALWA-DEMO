import Link from 'next/link';
import { ListRow, StatusPill } from '@isalwa/ui';
import type { OrderSummaryReadModel } from '@isalwa/os-contracts';
import {
  formatListAge,
  formatOrderStatus,
  statusTone,
} from '@/lib/commercial/labels';
import { formatCentavos } from '@/lib/commercial/money';
import { orderHref, quoteHref } from '@/lib/commercial/navigation';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

type OrderListProps = {
  partyId: string;
  items: OrderSummaryReadModel[];
  memberLabels: MemberLabelMap;
};

const recordLinkClass =
  'isalwa-t-fast font-medium text-[var(--isalwa-kiln)] outline-none hover:text-[var(--isalwa-glaze-deep)] focus-visible:shadow-[var(--isalwa-shadow-focus)]';

const accentLinkClass =
  'isalwa-t-fast text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline';

export function OrderList({ partyId, items, memberLabels }: OrderListProps) {
  return (
    <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Pedidos" data-tour={TOUR_TARGET.orderList}>
      {items.map((item) => {
        const createdAt = formatListAge(item.createdAt);
        return (
          <ListRow key={item.orderId} as="li" className="px-1 py-2">
            <div className="bg-white px-4 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Link href={orderHref(partyId, item.orderId)} className={recordLinkClass}>
                    {item.orderNumber}
                  </Link>
                  <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
                    Pedido registrado desde una cotización.
                  </p>
                  <dl className="mt-4 grid gap-2 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                    <div>
                      <dt className="sr-only">Total</dt>
                      <dd>Total: {formatCentavos(item.totalCentavos, item.currency)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Responsable</dt>
                      <dd>Responsable: {memberLabel(memberLabels, item.ownerMemberId)}</dd>
                    </div>
                    {item.quoteId ? (
                      <div>
                        <dt className="sr-only">Cotización de origen</dt>
                        <dd>
                          <Link href={quoteHref(partyId, item.quoteId)} className={accentLinkClass}>
                            Cotización de origen
                          </Link>
                        </dd>
                      </div>
                    ) : null}
                    {createdAt ? (
                      <div>
                        <dt className="sr-only">Creado</dt>
                        <dd>Creado: {createdAt}</dd>
                      </div>
                    ) : null}
                    {item.cancelledAt ? (
                      <div>
                        <dt className="sr-only">Cancelado</dt>
                        <dd>Cancelado: {formatListAge(item.cancelledAt) ?? '—'}</dd>
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
        );
      })}
    </ul>
  );
}
