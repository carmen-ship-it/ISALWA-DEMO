/**
 * T03 L4: who may see, own and decide a correction request. The customer facts come from the
 * customer domain through this port (the same facts os-party uses for customer commands), and
 * the decision uses the shared os-contracts rules, so no parallel customer-authority model exists.
 */
import {
  canActOnCustomer,
  canKnowCustomer,
  correctionApplyRule,
  MASTER_DATA_ADMIN_SCOPE,
  type CorrectionField,
  type CustomerCoverageGrant,
} from '@isalwa/os-contracts';
import { memberHasGrantedScope, type MemberAccessSnapshot } from '@isalwa/os-domain';

export const FISCAL_ADMIN_SCOPE = 'fiscal.admin';

export type CorrectionCustomerFacts = {
  accountOwnerMemberId: string | null;
  ownerIsDirectReportOfActor: boolean;
  coverageGrants: readonly CustomerCoverageGrant[];
};

export interface CorrectionCustomerPort {
  /** Facts as seen by `memberId`; null when the party is missing or belongs to another organization. */
  customerFacts(input: {
    organizationId: string;
    partyId: string;
    memberId: string;
    asOf: Date;
  }): Promise<CorrectionCustomerFacts | null>;
  /** The named contact and location (when given) belong to this party in this organization. */
  targetBelongsToParty(input: {
    organizationId: string;
    partyId: string;
    contactId: string | null;
    locationId: string | null;
  }): Promise<boolean>;
}

export type CorrectionAccess = { known: boolean; canApply: boolean };

export function correctionAccess(input: {
  snap: MemberAccessSnapshot;
  organizationId: string;
  partyId: string;
  field: CorrectionField;
  asOf: Date;
  facts: CorrectionCustomerFacts | null;
}): CorrectionAccess {
  const { snap, facts } = input;
  if (!facts || snap.accessStatus !== 'active') return { known: false, canApply: false };
  const grantedScopes = [...snap.roleKeys, ...snap.delegatedScopes];
  const base = {
    actorMemberId: snap.memberId,
    organizationId: input.organizationId,
    customerPartyId: input.partyId,
    grantedScopes,
    asOf: input.asOf,
    ...facts,
  };
  const known = canKnowCustomer(base);
  if (!known) return { known, canApply: false };
  const rule = correctionApplyRule(input.field);
  const steward = memberHasGrantedScope(snap, MASTER_DATA_ADMIN_SCOPE);
  const canApply =
    rule === 'fiscal'
      ? memberHasGrantedScope(snap, FISCAL_ADMIN_SCOPE)
      : rule === 'steward'
        ? steward
        : steward || canActOnCustomer({ ...base, action: 'edit' });
  return { known, canApply };
}
