import Link from 'next/link';
import { ListRow, StatusPill } from '@isalwa/ui';
import type { OpportunitySummaryReadModel } from '@isalwa/os-contracts';
import {
  formatOpportunityStatus,
  presentStage,
  formatTimestamp,
  statusTone,
} from '@/lib/commercial/labels';
import { formatOptionalCentavos } from '@/lib/commercial/money';
import { opportunityHref } from '@/lib/commercial/navigation';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

type OpportunityListProps = {
  partyId: string;
  items: OpportunitySummaryReadModel[];
  memberLabels: MemberLabelMap;
};

export function OpportunityList({ partyId, items, memberLabels }: OpportunityListProps) {
  return (
    <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Oportunidades" data-tour={TOUR_TARGET.opportunityList}>
      {items.map((item) => {
        const value = formatOptionalCentavos(item.expectedValueCentavos ?? undefined, 'BOB');
        return (
          <ListRow key={item.opportunityId} as="li" className="px-1 py-1">
            <div className="rounded-[var(--isalwa-radius-control)] px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={opportunityHref(partyId, item.opportunityId)}
                    className="isalwa-t-fast font-medium text-[var(--isalwa-kiln)] outline-none hover:text-[var(--isalwa-glaze-deep)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                  >
                    {item.title}
                  </Link>
                  <dl className="mt-3 grid gap-1 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                    <div>
                      <dt className="sr-only">Etapa</dt>
                      <dd>Etapa: {presentStage(item.stage)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Responsable</dt>
                      <dd>Responsable: {memberLabel(memberLabels, item.ownerMemberId)}</dd>
                    </div>
                    {value ? (
                      <div>
                        <dt className="sr-only">Monto</dt>
                        <dd>Total estimado: {value}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="sr-only">Creada</dt>
                      <dd>Creada: {formatTimestamp(item.createdAt)}</dd>
                    </div>
                    {item.closedAt ? (
                      <div>
                        <dt className="sr-only">Cierre</dt>
                        <dd>Cerrada: {formatTimestamp(item.closedAt)}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                <StatusPill tone={statusTone(item.status)}>
                  {formatOpportunityStatus(item.status)}
                </StatusPill>
              </div>
            </div>
          </ListRow>
        );
      })}
    </ul>
  );
}
