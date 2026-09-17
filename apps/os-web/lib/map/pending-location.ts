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

export type PendingLocationCardCopy = {
  title: string;
  helper: string;
  cta: string;
  href: string;
  tone: 'warning' | 'manual';
};

/**
 * Single honest CTA for rows without confirmed coordinates.
 * Never geocodes or opens fabricated map pins.
 */
export function pendingLocationCta(
  row: Pick<MapCustomerRow, 'partyId' | 'hasCoordinates' | 'hasProvenance'>,
): PendingLocationCta | null {
  if (row.hasCoordinates) return null;
  const href = partyMapLocationHref(row.partyId);
  if (row.hasProvenance) {
    return {
      href,
      tone: 'manual',
      label: 'Completar ubicación',
    };
  }
  return {
    href,
    tone: 'warning',
    label: 'Completar ubicación',
  };
}

/**
 * Pending location card — human wording, no provenance jargon.
 */
export function pendingLocationCardCopy(
  row: Pick<MapCustomerRow, 'partyId' | 'hasCoordinates' | 'hasProvenance'>,
): PendingLocationCardCopy | null {
  if (row.hasCoordinates) return null;
  const href = partyMapLocationHref(row.partyId);
  if (row.hasProvenance) {
    return {
      title: 'Ubicación por confirmar',
      helper:
        'Tenemos una referencia registrada, pero todavía no un punto confirmado.',
      cta: 'Completar ubicación',
      href,
      tone: 'manual',
    };
  }
  return {
    title: 'Ubicación por confirmar',
    helper: 'Todavía no hay un punto confirmado para este cliente.',
    cta: 'Completar ubicación',
    href,
    tone: 'warning',
  };
}
