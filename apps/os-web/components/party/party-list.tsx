import Link from 'next/link';
import { StatusPill, type OperatingRowDensity } from '@isalwa/ui';
import type { PartySummaryReadModel } from '@isalwa/os-contracts';
import { OperatingScanListHeader, OperatingScanRow } from '@/components/lists/operating-scan-row';
import { presentHumanCopy } from '@/lib/demo/human-facing-copy';
import { panelHref, parsePanel, type ListQueryState } from '@/lib/lists/url-state';
import { formatPartyRoles, formatPartyStatus, partyStatusTone } from '@/lib/party/labels';
import { partyListLocationMeta } from '@/lib/party/next-action';
import { partyHref } from '@/lib/party/navigation';
import type { MemberLabelMap } from '@/lib/work/member-resolver';
import { memberLabel } from '@/lib/work/member-resolver';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

type PartyListProps = {
  items: PartySummaryReadModel[];
  listPath?: string;
  listQuery?: ListQueryState;
  memberLabels?: MemberLabelMap;
  density?: OperatingRowDensity;
};

const DESKTOP_GRID =
  'md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto_auto]';

const HEADER_COLUMNS = [
  { id: 'client', label: 'Cliente', className: 'min-w-0' },
  { id: 'relation', label: 'Relación', className: 'min-w-0' },
  { id: 'context', label: 'Contexto', className: 'min-w-0' },
  { id: 'status', label: 'Estado', className: 'justify-self-end' },
  { id: 'action', label: '', className: 'justify-self-end' },
];

function relationshipLabel(roleKeys: string[]): string {
  const labels = formatPartyRoles(roleKeys);
  return labels.length > 0 ? labels.join(', ') : 'Sin relación';
}

function contextMeta(party: PartySummaryReadModel, memberLabels?: MemberLabelMap): string {
  const ownerId = party.commercialOwnerMemberId?.trim();
  const owner = ownerId && memberLabels ? memberLabel(memberLabels, ownerId) : null;
  const phone = party.primaryPhone?.trim() || null;
  const location = partyListLocationMeta(party);
  return [owner ? `Responsable: ${owner}` : null, phone, location]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
}

export function PartyList({ items, listPath, listQuery, memberLabels, density = 'compact' }: PartyListProps) {
  const openPanel = parsePanel(listQuery?.panel);
  const visibleItems = items.filter(
    (party) =>
      !isEngineeringFixtureCopy(party.displayName) &&
      !isEngineeringFixtureCopy(party.legalName),
  );

  return (
    <div className="commercial-operating-list min-w-0" data-tour="clientes-list">
      <OperatingScanListHeader columns={HEADER_COLUMNS} className={DESKTOP_GRID} />
      <ul className="m-0 list-none p-0" aria-label="Lista de clientes y relaciones">
        {visibleItems.map((party) => {
          const displayName =
            presentHumanCopy(party.displayName || party.legalName) ||
            party.displayName ||
            party.legalName ||
            'Sin nombre';
          const detailHref = partyHref(party.partyId);
          const quickHref = listPath
            ? panelHref(listPath, listQuery ?? {}, `party:${party.partyId}`)
            : undefined;
          const selected = openPanel?.kind === 'party' && openPanel.id === party.partyId;
          const relation = relationshipLabel(party.activeRoleKeys);
          const context = contextMeta(party, memberLabels) || '—';

          return (
            <li key={party.partyId} data-tour={TOUR_TARGET.customerRow}>
              <OperatingScanRow
                href={detailHref}
                density={density}
                selected={selected}
                title={displayName}
                desktopGridClassName={DESKTOP_GRID}
                fields={[
                  { id: 'relation', label: 'Relación', value: relation },
                  { id: 'context', label: 'Contexto', value: context, hideOnMobile: true },
                ]}
                status={
                  <StatusPill tone={partyStatusTone(party.status)}>
                    {formatPartyStatus(party.status)}
                  </StatusPill>
                }
                actionLabel="Ver Cliente 360"
                secondaryActions={
                  quickHref ? (
                    <Link
                      href={quickHref}
                      className="isalwa-t-fast inline-flex h-8 shrink-0 items-center justify-center rounded-[var(--isalwa-radius-control)] px-2 text-xs font-medium text-[var(--isalwa-slate)] outline-none hover:text-[var(--isalwa-glaze-deep)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                    >
                      Vista rápida
                    </Link>
                  ) : undefined
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
