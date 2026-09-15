import type { PartySummaryReadModel } from '@isalwa/os-contracts';
import { mapCoverage as partyMapCoverage } from '@/lib/party/data-health';

export type MapCustomerBucket = 'plottable' | 'provenance_only' | 'no_location';

export type MapCustomerRow = {
  partyId: string;
  displayName: string;
  primaryPhone: string | null;
  commercialOwnerMemberId: string | null;
  hasCoordinates: boolean;
  hasProvenance: boolean;
  bucket: MapCustomerBucket;
};

export type MapCoverageHonesty = {
  withCoordinates: number;
  provenanceOnly: number;
  total: number;
  /** Primary honesty line: "N de M tienen coordenadas" */
  honesty: string | null;
  /** Established longer form from party data-health */
  sentence: string | null;
  factsPresent: boolean;
};

export type MapDeskViewModel = {
  coverage: MapCoverageHonesty;
  plottable: MapCustomerRow[];
  provenanceOnly: MapCustomerRow[];
  noLocation: MapCustomerRow[];
  all: MapCustomerRow[];
  partial: boolean;
};

function hasProvenance(item: PartySummaryReadModel): boolean {
  return Boolean(item.locationProvenanceUrl?.trim());
}

function bucketFor(item: PartySummaryReadModel): MapCustomerBucket {
  if (item.hasCoordinates === true) return 'plottable';
  if (item.hasCoordinates === false && hasProvenance(item)) return 'provenance_only';
  return 'no_location';
}

function toRow(item: PartySummaryReadModel): MapCustomerRow {
  return {
    partyId: item.partyId,
    displayName: item.displayName.trim() || 'Sin nombre',
    primaryPhone: item.primaryPhone ?? null,
    commercialOwnerMemberId: item.commercialOwnerMemberId ?? null,
    hasCoordinates: item.hasCoordinates === true,
    hasProvenance: hasProvenance(item),
    bucket: bucketFor(item),
  };
}

/**
 * Build the map desk model from party search rows.
 * Never invents coordinates. A Maps URL is provenance, not a pin.
 */
export function buildMapDeskViewModel(
  items: readonly PartySummaryReadModel[],
  options: { partial?: boolean } = {},
): MapDeskViewModel {
  const coverageBase = partyMapCoverage(items);
  const rows = items.map(toRow);
  const plottable = rows.filter((row) => row.bucket === 'plottable');
  const provenanceOnly = rows.filter((row) => row.bucket === 'provenance_only');
  const noLocation = rows.filter((row) => row.bucket === 'no_location');
  const factsPresent = coverageBase.sentence !== null;

  return {
    coverage: {
      withCoordinates: coverageBase.withCoordinates,
      provenanceOnly: coverageBase.provenanceOnly,
      total: coverageBase.total,
      honesty: factsPresent
        ? `${coverageBase.withCoordinates} de ${coverageBase.total} tienen coordenadas`
        : null,
      sentence: coverageBase.sentence,
      factsPresent,
    },
    plottable,
    provenanceOnly,
    noLocation,
    all: rows,
    partial: options.partial === true,
  };
}
