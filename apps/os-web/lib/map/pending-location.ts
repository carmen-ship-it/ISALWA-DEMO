import type { MapCustomerRow } from '@/lib/map/build-view-model';

/** Cliente 360 section anchor — location edits happen there, never on the map canvas. */
export function partyMapLocationHref(partyId: string): string {
  return `/clientes/${encodeURIComponent(partyId)}#ubicaciones`;
}

export type PendingLocationCta = {
  label: string;
  href: string;
  tone: 'warning' | 'manual';
};

/**
 * Single honest CTA for rows without confirmed coordinates.
 * Never geocodes or opens fabricated map pins.
 */
export function pendingLocationCta(row: Pick<MapCustomerRow, 'partyId' | 'hasCoordinates' | 'hasProvenance'>): PendingLocationCta | null {
  if (row.hasCoordinates) return null;
  const href = partyMapLocationHref(row.partyId);
  if (row.hasProvenance) {
    return {
      href,
      tone: 'manual',
      label: 'Completar coordenadas en Ubicaciones',
    };
  }
  return {
    href,
    tone: 'warning',
    label: 'Registrar ubicación en Cliente 360',
  };
}
