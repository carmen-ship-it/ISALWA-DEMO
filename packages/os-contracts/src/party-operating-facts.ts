/**
 * Canonical operating facts for a customer row.
 * Coordinates mean latitude and longitude. A Maps link is provenance, not a location.
 * Phone is a stored contact phone. WhatsApp is not treated as a connected channel.
 */

export type OperatingContactSource = {
  id: string;
  status: string;
  phone: string | null;
};

export type OperatingLocationSource = {
  status: string;
  latitude: number | null;
  longitude: number | null;
  provenanceUrl: string | null;
};

export function locationHasCoordinates(location: OperatingLocationSource): boolean {
  if (location.status !== 'active') return false;
  return Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
}

export function selectPrimaryPhone(contacts: readonly OperatingContactSource[]): string | null {
  const active = contacts
    .filter((contact) => contact.status === 'active')
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const contact of active) {
    const phone = contact.phone?.trim();
    if (phone) return phone;
  }
  return null;
}

export function selectLocationProvenanceUrl(
  locations: readonly OperatingLocationSource[],
): string | null {
  const active = locations.filter((location) => location.status === 'active');
  for (const location of active) {
    const url = location.provenanceUrl?.trim();
    if (url) return url;
  }
  return null;
}

export function normalizeProvenanceUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}
