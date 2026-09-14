import { OperatingRow, OverflowMenu, StatusPill } from '@isalwa/ui';
import type { PartySummaryReadModel } from '@isalwa/os-contracts';
import { panelHref, parsePanel, type ListQueryState } from '@/lib/lists/url-state';
import { formatPartyRoles, formatPartyStatus, partyStatusTone } from '@/lib/party/labels';
import { partyHref } from '@/lib/party/navigation';
import type { MemberLabelMap } from '@/lib/work/member-resolver';
import { memberLabel } from '@/lib/work/member-resolver';

type PartyListProps = {
  items: PartySummaryReadModel[];
  listPath?: string;
  listQuery?: ListQueryState;
  memberLabels?: MemberLabelMap;
};

function relationshipLabel(roleKeys: string[]): string {
  const labels = formatPartyRoles(roleKeys);
  return labels.length > 0 ? labels.join(', ') : 'Sin relación';
}

function operatingMeta(party: PartySummaryReadModel, memberLabels?: MemberLabelMap): string {
  const ownerId = party.commercialOwnerMemberId?.trim();
  const owner = ownerId && memberLabels ? `Responsable: ${memberLabel(memberLabels, ownerId)}` : null;
  const phone = party.primaryPhone?.trim() || null;
  const location = party.hasCoordinates === true ? 'Ubicación disponible' : null;
  return [owner, phone, location].filter((part): part is string => Boolean(part)).join(' · ');
}

export function PartyList({ items, listPath, listQuery, memberLabels }: PartyListProps) {
  const openPanel = parsePanel(listQuery?.panel);

  return (
    <ul className="m-0 list-none p-0" aria-label="Lista de clientes y relaciones">
      {items.map((party) => {
        const displayName = party.displayName || party.legalName || 'Sin nombre';
        const detailHref = partyHref(party.partyId);
        const quickHref = listPath
          ? panelHref(listPath, listQuery ?? {}, `party:${party.partyId}`)
          : undefined;
        const selected = openPanel?.kind === 'party' && openPanel.id === party.partyId;

        return (
          <li key={party.partyId}>
            <OperatingRow
              href={detailHref}
              selected={selected}
              subject={displayName}
              meta={
                [relationshipLabel(party.activeRoleKeys), operatingMeta(party, memberLabels)]
                  .filter(Boolean)
                  .join(' · ')
              }
              status={
                <StatusPill tone={partyStatusTone(party.status)}>
                  {formatPartyStatus(party.status)}
                </StatusPill>
              }
              actions={
                quickHref ? (
                  <OverflowMenu
                    label={`Más acciones de ${displayName}`}
                    items={[
                      { id: 'open', label: 'Abrir', href: detailHref },
                      { id: 'quick', label: 'Vista rápida', href: quickHref },
                    ]}
                  />
                ) : undefined
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
