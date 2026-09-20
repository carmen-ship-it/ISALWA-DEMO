import { OperatingRow, StatusPill, type OperatingRowDensity } from '@isalwa/ui';
import type { OrderSummaryReadModel } from '@isalwa/os-contracts';
import '@/components/commercial/commercial-surfaces.css';
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

function metaLine(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' · ');
}

export function OrderOrgList({ items, memberLabels, partyLabels, density = 'compact' }: OrderOrgListProps) {
  return (
    <ul
      className="commercial-operating-list min-w-0"
      aria-label="Pedidos"
      data-tour={TOUR_TARGET.orderList}
    >
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
          const meta = metaLine([
            customer,
            formatCentavos(item.totalCentavos, item.currency),
            owner ? `Responsable: ${owner}` : null,
            dateLabel,
          ]);

          return (
            <li key={item.orderId}>
              <OperatingRow
                href={detailHref}
                density={density}
                subject={item.orderNumber}
                meta={meta || undefined}
                status={
                  <StatusPill tone={statusTone(item.status)}>
                    {formatOrderStatus(item.status)}
                  </StatusPill>
                }
              />
            </li>
          );
        })}
    </ul>
  );
}
