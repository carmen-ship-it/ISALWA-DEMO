import { OperatingRow, OverflowMenu, StatusPill } from '@isalwa/ui';
import type { PartySummaryReadModel } from '@isalwa/os-contracts';
import { panelHref, parsePanel, type ListQueryState } from '@/lib/lists/url-state';
import { formatPartyRoles, formatPartyStatus, partyStatusTone } from '@/lib/party/labels';
import { partyHref } from '@/lib/party/navigation';

type PartyListProps = {
  items: PartySummaryReadModel[];
  listPath?: string;
  listQuery?: ListQueryState;
};

function relationshipLabel(roleKeys: string[]): string {
  const labels = formatPartyRoles(roleKeys);
  return labels.length > 0 ? labels.join(', ') : 'Sin relación';
}

export function PartyList({ items, listPath, listQuery }: PartyListProps) {
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
              meta={relationshipLabel(party.activeRoleKeys)}
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
