import { StatusPill, type OperatingRowDensity } from '@isalwa/ui';
import type { OrderSummaryReadModel } from '@isalwa/os-contracts';
import '@/components/commercial/commercial-surfaces.css';
import { OperatingScanListHeader, OperatingScanRow } from '@/components/lists/operating-scan-row';
import { formatListAge, formatOrderStatus, statusTone } from '@/lib/commercial/labels';
import { formatCentavos } from '@/lib/commercial/money';
import { orderHref } from '@/lib/commercial/navigation';
import { partyLabel, type PartyLabelMap } from '@/lib/commercial/party-resolver';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

type OrderOrgListProps = {
  items: OrderSummaryReadModel[];
  memberLabels: MemberLabelMap;
  partyLabels: PartyLabelMap;
  density?: OperatingRowDensity;
};

const DESKTOP_GRID =
  'md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.85fr)_4.5rem_auto_auto]';

const HEADER_COLUMNS = [
  { id: 'title', label: 'Pedido', className: 'min-w-0' },
  { id: 'client', label: 'Cliente', className: 'min-w-0' },
  { id: 'owner', label: 'Responsable', className: 'min-w-0' },
  { id: 'amount', label: 'Monto', className: 'min-w-0' },
  { id: 'age', label: 'Antigüedad', className: 'min-w-0' },
  { id: 'status', label: 'Estado', className: 'justify-self-end' },
  { id: 'action', label: '', className: 'justify-self-end' },
];

export function OrderOrgList({ items, memberLabels, partyLabels, density = 'compact' }: OrderOrgListProps) {
  return (
    <div className="commercial-operating-list min-w-0" data-tour={TOUR_TARGET.orderList}>
      <OperatingScanListHeader columns={HEADER_COLUMNS} className={DESKTOP_GRID} />
      <ul className="m-0 list-none p-0" aria-label="Pedidos">
        {items
          .filter(
            (item) =>
              !isEngineeringFixtureCopy(item.orderNumber) &&
              !isEngineeringFixtureCopy(partyLabel(partyLabels, item.partyId)),
          )
          .map((item) => {
            const customer = partyLabel(partyLabels, item.partyId);
            const owner = memberLabel(memberLabels, item.ownerMemberId);
            const dateLabel = formatListAge(item.createdAt);
            const detailHref = orderHref(item.partyId, item.orderId);

            return (
              <li key={item.orderId}>
                <OperatingScanRow
                  href={detailHref}
                  density={density}
                  title={item.orderNumber}
                  desktopGridClassName={DESKTOP_GRID}
                  fields={[
                    { id: 'client', label: 'Cliente', value: customer },
                    { id: 'owner', label: 'Responsable', value: owner || '—' },
                    {
                      id: 'amount',
                      label: 'Monto',
                      value: formatCentavos(item.totalCentavos, item.currency),
                      hideOnMobile: true,
                    },
                    { id: 'age', label: 'Antigüedad', value: dateLabel ?? '—', hideOnMobile: true },
                  ]}
                  status={
                    <StatusPill tone={statusTone(item.status)} icon="none">
                      {formatOrderStatus(item.status)}
                    </StatusPill>
                  }
                  actionLabel="Ver pedido"
                />
              </li>
            );
          })}
      </ul>
    </div>
  );
}
