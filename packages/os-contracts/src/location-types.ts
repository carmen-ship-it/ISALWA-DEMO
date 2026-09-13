/** Canonical Location status — active | inactive (no merge). */
export const LOCATION_STATUSES = ['active', 'inactive'] as const;
export type LocationStatus = (typeof LOCATION_STATUSES)[number];
