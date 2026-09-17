'use client';

import { QuickViewHost } from '@/components/operating/quick-view-host';
import { MapQuickViewCompact } from '@/components/map/map-quick-view-compact';
import type { MapCustomerRow } from '@/lib/map/build-view-model';
import type { MapPartyCommercialSnapshot } from '@/lib/map/commercial-lens';
import type { ListQueryState } from '@/lib/lists/url-state';

type MapPartyDrawerProps = {
  open: boolean;
  row: MapCustomerRow;
  ownerLabel: string | null;
  listQuery: ListQueryState;
  commercial: MapPartyCommercialSnapshot | null;
  nextActionLabel?: string | null;
  issueCount?: number | null;
  lastUpdatedIso?: string | null;
};

/**
 * Desktop map selection — ContextDrawer host aligned with Clientes quick view.
 */
export function MapPartyDrawer({
  open,
  row,
  ownerLabel,
  listQuery,
  commercial,
  nextActionLabel = null,
  issueCount = null,
  lastUpdatedIso = null,
}: MapPartyDrawerProps) {
  return (
    <QuickViewHost open={open} title={row.displayName} listPath="/mapa" listQuery={listQuery}>
      <MapQuickViewCompact
        row={row}
        ownerLabel={ownerLabel}
        onCloseHref=""
        commercial={commercial}
        variant="drawer"
        nextActionLabel={nextActionLabel}
        issueCount={issueCount}
        lastUpdatedIso={lastUpdatedIso}
      />
    </QuickViewHost>
  );
}
