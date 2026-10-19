import type { CommitmentState } from './commitments';
import type { ContactEndpointChannel } from './party-commands';

/**
 * T03 L1: who may receive anything on a contact's number. Every recipient selection uses this;
 * a future sender (T12) stores `recipientVersion` when it plans a send and calls
 * `assertRecipientStillEligible` immediately before sending.
 */
export type RecipientContact = {
  id: string;
  version: number;
  status: string;
  relationEndedAt?: Date | string | null;
  phone: string | null;
  whatsapp: string | null;
  phoneStatus?: string | null;
  whatsappStatus?: string | null;
  phoneRetiredAt?: Date | string | null;
  whatsappRetiredAt?: Date | string | null;
};

export const RECIPIENT_INELIGIBLE_REASONS = [
  'relation_ended',
  'contact_inactive',
  'no_current_number',
  'endpoint_retired',
  'identity_review',
  'recipient_changed',
] as const;
export type RecipientIneligibleReason = (typeof RECIPIENT_INELIGIBLE_REASONS)[number];

export type RecipientEligibility =
  | { eligible: true; numberE164: string; recipientVersion: string }
  | { eligible: false; reason: RecipientIneligibleReason };

/** A contact whose relationship with the customer is current. */
export function isCurrentContact(contact: Pick<RecipientContact, 'status' | 'relationEndedAt'>): boolean {
  return contact.status === 'active' && !contact.relationEndedAt;
}

export function contactRecipientEligibility(
  contact: RecipientContact,
  channel: ContactEndpointChannel,
): RecipientEligibility {
  if (contact.relationEndedAt) return { eligible: false, reason: 'relation_ended' };
  if (contact.status !== 'active') return { eligible: false, reason: 'contact_inactive' };
  const number = channel === 'phone' ? contact.phone : contact.whatsapp;
  const status = channel === 'phone' ? contact.phoneStatus : contact.whatsappStatus;
  const retiredAt = channel === 'phone' ? contact.phoneRetiredAt : contact.whatsappRetiredAt;
  if (!number) return { eligible: false, reason: retiredAt ? 'endpoint_retired' : 'no_current_number' };
  if (status === 'identity_review') return { eligible: false, reason: 'identity_review' };
  return {
    eligible: true,
    numberE164: number,
    recipientVersion: `${contact.id}:${contact.version}:${channel}:${number}`,
  };
}

/** Any change to the contact since the send was planned (version, number, relationship) refuses the send. */
export function assertRecipientStillEligible(
  snapshotRecipientVersion: string,
  contact: RecipientContact,
  channel: ContactEndpointChannel,
): RecipientEligibility {
  const current = contactRecipientEligibility(contact, channel);
  if (!current.eligible) return current;
  if (current.recipientVersion !== snapshotRecipientVersion) return { eligible: false, reason: 'recipient_changed' };
  return current;
}

/** T03 L1: `GET /v1/parties/:partyId/contacts/:contactId/relationship-end-preview`. Numbers masked. */
export type ContactRelationshipEndPreview = {
  partyId: string;
  contactId: string;
  version: number;
  relationStatus: 'current' | 'ended';
  documentRecipient: { isCurrentDefault: boolean; replacementContactId: string | null };
  channels: { channel: ContactEndpointChannel; number: string | null; status: string | null }[];
  followupPreferences: number;
  openIdentityReviews: number;
  /** The customer's open commitments; none is linked to a contact in this model. */
  customerOpenCommitments: { id: string; dueAt: string | null; ownerMemberId: string; state: CommitmentState }[];
  commitmentLinkage: 'customer';
  automaticSends: { configured: false; label: 'Envíos automáticos no configurados.' };
};

/** The customer's default contact for documents: the first current contact in the given order, never a former one. */
export function pickCurrentContact<T extends Pick<RecipientContact, 'status' | 'relationEndedAt'>>(
  contacts: readonly T[],
): T | null {
  return contacts.find(isCurrentContact) ?? null;
}
