import Link from 'next/link';
import { ListRow } from '@isalwa/ui';
import type { PartySummaryReadModel } from '@isalwa/os-contracts';
import {
  CommercialBadge,
  PartyRoleBadges,
  PartyStatusBadge,
} from '@/components/party/party-role-badges';
import { multiRoleHint } from '@/lib/party/labels';
import { partyHref } from '@/lib/party/navigation';

type PartyListProps = {
  items: PartySummaryReadModel[];
};

export function PartyList({ items }: PartyListProps) {
  return (
    <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Lista de clientes y relaciones">
      {items.map((party) => {
        const hint = multiRoleHint(party.activeRoleKeys);
        const displayName = party.displayName || party.legalName || 'Sin nombre';
        return (
          <ListRow key={party.partyId} as="li" className="px-1 py-1">
            <Link
              href={partyHref(party.partyId)}
              className="isalwa-t-fast block min-w-0 rounded-[var(--isalwa-radius-control)] px-3 py-4 outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium text-[var(--isalwa-kiln)]">{displayName}</p>
                  {party.legalName && party.legalName !== party.displayName ? (
                    <p className="mt-1 break-words text-sm text-[var(--isalwa-slate)]">{party.legalName}</p>
                  ) : null}
                  {hint ? <p className="mt-2 break-words text-sm text-[var(--isalwa-slate)]">{hint}</p> : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <PartyRoleBadges roleKeys={party.activeRoleKeys} size="sm" />
                  <PartyStatusBadge status={party.status} duplicateStatus={party.duplicateStatus} />
                  <CommercialBadge
                    hasCommercialAccount={party.hasCommercialAccount}
                    commercialAccountStatus={party.commercialAccountStatus}
                  />
                </div>
              </div>
            </Link>
          </ListRow>
        );
      })}
    </ul>
  );
}
