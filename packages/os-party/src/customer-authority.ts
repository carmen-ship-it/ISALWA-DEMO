import {
  canActOnCustomer,
  canKnowCustomer,
  COMMAND_REQUIRED_SCOPES,
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  MASTER_DATA_ADMIN_SCOPE,
  type CustomerCoverageGrant,
  type CustomerLifecycleAction,
  type RequestContext,
} from '@isalwa/os-contracts';
import { memberHasScope, type MemberAccessSnapshot } from '@isalwa/os-domain';
import type { OsPartyStore } from './os-party-store';

/** Party/location commands a commercial actor may run on a customer they have authority over (A2 §2). */
export const CUSTOMER_COMMAND_ACTION: Partial<Record<string, CustomerLifecycleAction>> = {
  UpdateParty: 'edit',
  UpdateContact: 'edit',
  ChangeContactEndpoint: 'edit',
  RetireContactEndpoint: 'edit',
  RevealContactEndpoint: 'edit',
  ResolveContactIdentityReview: 'edit',
  EndContactRelationship: 'edit',
  CreateLocation: 'edit',
  UpdateLocation: 'edit',
  DeactivateLocation: 'edit',
  DeactivateParty: 'archive',
  ReactivateParty: 'reactivate',
};

export type CustomerAuthorityFacts = {
  accountOwnerMemberId: string | null;
  ownerIsDirectReportOfActor: boolean;
  coverageGrants: readonly CustomerCoverageGrant[];
};

export async function loadCustomerAuthorityFacts(
  store: OsPartyStore,
  ctx: RequestContext,
  partyId: string,
): Promise<CustomerAuthorityFacts> {
  const { organizationId, actorMemberId, effectiveAt } = ctx;
  const account = await store.getCommercialAccountForParty(organizationId, partyId);
  const owner = account && account.organizationId === organizationId ? account.ownerMemberId : null;
  const coverageGrants = await store.listCustomerCoverageGrants(organizationId, partyId);
  const ownerIsDirectReportOfActor =
    owner && owner !== actorMemberId
      ? await store.isDirectReport(organizationId, actorMemberId, owner, effectiveAt)
      : false;
  return { accountOwnerMemberId: owner, ownerIsDirectReportOfActor, coverageGrants };
}

export function actorCanKnowCustomer(
  ctx: RequestContext,
  snap: MemberAccessSnapshot,
  partyId: string,
  facts: CustomerAuthorityFacts,
): boolean {
  return canKnowCustomer({
    actorMemberId: ctx.actorMemberId,
    organizationId: ctx.organizationId,
    customerPartyId: partyId,
    grantedScopes: [...snap.roleKeys, ...snap.delegatedScopes],
    asOf: ctx.effectiveAt,
    ...facts,
  });
}

/**
 * Non-resource commands: the registered scope, or for CreateParty the bounded
 * seller path (commercial.customer.create; bounds enforced by the command).
 *
 * Customer commands (CUSTOMER_COMMAND_ACTION) with a target party, in order:
 * 1. missing, foreign, or not knowable by the caller → NOT_FOUND, identical
 *    for all three (T02 non-disclosure);
 * 2. master_data.admin keeps its data-steward maintenance of party data;
 * 3. otherwise canActOnCustomer (action scope + owner/leadership range or
 *    coverage that explicitly covers customer.<action>) else PERMISSION_DENIED.
 */
export async function assertPartyCommandAuthority(input: {
  store: OsPartyStore;
  ctx: RequestContext;
  snap: MemberAccessSnapshot;
  command: string;
  customerPartyId?: string | null;
}): Promise<void> {
  const required = COMMAND_REQUIRED_SCOPES[input.command];
  if (!required || required === 'member_active') return;
  const action = CUSTOMER_COMMAND_ACTION[input.command];
  const partyId = input.customerPartyId?.trim();
  if (!action || !partyId) {
    if (memberHasScope(input.snap, required)) return;
    if (
      input.command === 'CreateParty' &&
      input.snap.accessStatus === 'active' &&
      [...input.snap.roleKeys, ...input.snap.delegatedScopes].includes(COMMERCIAL_CUSTOMER_CREATE_SCOPE)
    ) {
      return;
    }
    throw new Error('PERMISSION_DENIED');
  }

  const { ctx, snap, store } = input;
  const party = await store.getPartyInOrg(ctx.organizationId, partyId);
  if (!party || party.organizationId !== ctx.organizationId) throw new Error('NOT_FOUND');
  const facts = await loadCustomerAuthorityFacts(store, ctx, partyId);
  if (!actorCanKnowCustomer(ctx, snap, partyId, facts)) throw new Error('NOT_FOUND');
  if (memberHasScope(snap, required)) return;
  const allowed = canActOnCustomer({
    action,
    actorMemberId: ctx.actorMemberId,
    organizationId: ctx.organizationId,
    customerPartyId: partyId,
    grantedScopes: [...snap.roleKeys, ...snap.delegatedScopes],
    asOf: ctx.effectiveAt,
    ...facts,
  });
  if (!allowed) throw new Error('PERMISSION_DENIED');
}

/** T03 contract C3: what the viewer may do on this customer. Display hints; every command rechecks. */
export type CustomerAuthorityFlags = {
  canEditDisplayName: boolean;
  /** false → the API returns `party.legalName` as null. */
  canReadLegalName: boolean;
  canEditLegalName: boolean;
  canEditContacts: boolean;
  canChangeEndpoints: boolean;
  canReviewEndpointHistory: boolean;
  canRevealEndpoint: boolean;
  canResolveIdentityReview: boolean;
  canEndContactRelationship: boolean;
};

/**
 * Same rule as assertPartyCommandAuthority for the customer `edit` commands (UpdateParty,
 * UpdateContact, ChangeContactEndpoint, RetireContactEndpoint): master_data.admin, or canActOnCustomer.
 * A legal-name change stays data-steward maintenance. Reading the legal name is allowed to
 * whoever may edit the customer or is a data steward (engineering default 2026-10-18, pending
 * owner confirmation). The masked endpoint history and the justified reveal follow the same
 * edit rule (C6), and so does resolving an identity review (C7); engineering defaults 2026-10-18.
 * Ending a contact's relationship (L1) is a customer edit.
 */
export async function customerAuthorityFlags(input: {
  store: OsPartyStore;
  ctx: RequestContext;
  snap: MemberAccessSnapshot;
  partyId: string;
  partyStatus: string;
}): Promise<CustomerAuthorityFlags> {
  const { store, ctx, snap, partyId } = input;
  const steward = memberHasScope(snap, MASTER_DATA_ADMIN_SCOPE);
  const facts = await loadCustomerAuthorityFacts(store, ctx, partyId);
  const known = actorCanKnowCustomer(ctx, snap, partyId, facts);
  const canEdit =
    known &&
    (steward ||
      canActOnCustomer({
        action: 'edit',
        actorMemberId: ctx.actorMemberId,
        organizationId: ctx.organizationId,
        customerPartyId: partyId,
        grantedScopes: snap.accessStatus === 'active' ? [...snap.roleKeys, ...snap.delegatedScopes] : [],
        asOf: ctx.effectiveAt,
        ...facts,
      }));
  const mutable = canEdit && input.partyStatus !== 'merged';
  return {
    canEditDisplayName: mutable,
    canReadLegalName: known && (steward || canEdit),
    canEditLegalName: mutable && steward,
    canEditContacts: mutable,
    canChangeEndpoints: mutable,
    canReviewEndpointHistory: canEdit,
    canRevealEndpoint: canEdit,
    canResolveIdentityReview: mutable,
    canEndContactRelationship: mutable,
  };
}
