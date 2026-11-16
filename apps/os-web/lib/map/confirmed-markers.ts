import type { PartyLocationsResponse, LocationView } from '@/lib/party/types';

/** A pin the map may draw. Same shape the live canvas consumes. */
export type ConfirmedMarker = {
  partyId: string;
  displayName: string;
  lat: number;
  lng: number;
};

export type ConfirmedMarkerLoad = {
  markers: ConfirmedMarker[];
  /** Customers whose location read failed. They stay in the list; they are not pinned and not hidden. */
  failedCount: number;
};

/**
 * Confirmed = an active location with finite, in-range coordinates. The same rule the
 * server applies for `hasCoordinates` (active + finite), plus the geographic range check.
 * A map link, an address or a retired location never produces a pin. Exactly (0, 0) is
 * the classic "no value" default and is treated as unconfirmed.
 */
export function confirmedCoordinates(
  location: Pick<LocationView, 'status' | 'latitude' | 'longitude'>,
): { lat: number; lng: number } | null {
  if (location.status !== 'active') return null;
  const { latitude, longitude } = location;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { lat: latitude, lng: longitude };
}

export function pickConfirmedCoordinates(
  locations: readonly LocationView[],
): { lat: number; lng: number } | null {
  for (const location of locations) {
    const coordinates = confirmedCoordinates(location);
    if (coordinates) return coordinates;
  }
  return null;
}

const DEFAULT_CONCURRENCY = 6;

/**
 * One authorized location read per customer the actor can already read (the caller passes
 * only rows from the customer search), in small batches so a page never fans out unbounded.
 */
export async function loadConfirmedMarkers(
  client: { listPartyLocations: (partyId: string) => Promise<PartyLocationsResponse> },
  rows: readonly { partyId: string; displayName: string }[],
  options: { concurrency?: number } = {},
): Promise<ConfirmedMarkerLoad> {
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
  const markers: ConfirmedMarker[] = [];
  let failedCount = 0;

  for (let start = 0; start < rows.length; start += concurrency) {
    const batch = rows.slice(start, start + concurrency);
    const settled = await Promise.all(
      batch.map(async (row) => {
        try {
          const response = await client.listPartyLocations(row.partyId);
          const coordinates = pickConfirmedCoordinates(response.locations);
          return coordinates ? { ok: true as const, marker: { ...row, ...coordinates } } : { ok: true as const, marker: null };
        } catch {
          return { ok: false as const };
        }
      }),
    );
    for (const result of settled) {
      if (!result.ok) failedCount += 1;
      else if (result.marker) markers.push(result.marker);
    }
  }

  return { markers, failedCount };
}
