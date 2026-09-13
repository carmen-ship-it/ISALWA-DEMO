/** Location BusinessEvent types (Party-owned geography). */
export const OS_LOCATION_EVENT_TYPES = [
  'location.created',
  'location.updated',
  'location.deactivated',
] as const;

export type OsLocationEventType = (typeof OS_LOCATION_EVENT_TYPES)[number];

export function isOsLocationEventType(value: string): value is OsLocationEventType {
  return (OS_LOCATION_EVENT_TYPES as readonly string[]).includes(value);
}
