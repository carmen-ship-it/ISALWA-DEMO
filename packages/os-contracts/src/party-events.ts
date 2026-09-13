/** PartyGraph BusinessEvent types (Lane C). */
export const OS_PARTY_EVENT_TYPES = [
  'party.created',
  'party.updated',
  'party.deactivated',
  'party.reactivated',
  'party.role.assigned',
  'party.role.ended',
  'contact.updated',
  'party.fiscal_identity.changed',
  'party.duplicate.suggested',
  'party.merge.requested',
  'party.merged',
  'party.merge.rejected',
  'lead.created',
  'lead.resolved',
] as const;

export type OsPartyEventType = (typeof OS_PARTY_EVENT_TYPES)[number];

export function isOsPartyEventType(value: string): value is OsPartyEventType {
  return (OS_PARTY_EVENT_TYPES as readonly string[]).includes(value);
}
