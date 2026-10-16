import {
  canActOnCustomer,
  COMMAND_REQUIRED_SCOPES,
  type CustomerLifecycleAction,
  type RequestContext,
} from '@isalwa/os-contracts';
import { memberHasScope, type MemberAccessSnapshot } from '@isalwa/os-domain';
import type { OsPartyStore } from './os-party-store';

/** Party/location commands a commercial actor may run on a customer they have authority over (A2 §2). */
export const CUSTOMER_COMMAND_ACTION: Partial<Record<string, CustomerLifecycleAction>> = {
  UpdateParty: 'edit',
  UpdateContact: 'edit',
  CreateLocation: 'edit',
  UpdateLocation: 'edit',
  DeactivateLocation: 'edit',
  DeactivateParty: 'archive',
  ReactivateParty: 'reactivate',
};

/**
 * Command scope first (master_data.admin keeps its data-steward meaning). Otherwise
 * the command must be a customer action and the actor must pass canActOnCustomer on
 * that party. Missing, foreign, and unauthorized parties all end as PERMISSION_DENIED.
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
  if (memberHasScope(input.snap, required)) return;
  const action = CUSTOMER_COMMAND_ACTION[input.command];
  const partyId = input.customerPartyId?.trim();
  if (!action || !partyId) throw new Error('PERMISSION_DENIED');

  const { organizationId, actorMemberId, effectiveAt } = input.ctx;
  const account = await input.store.getCommercialAccountForParty(organizationId, partyId);
  const owner = account && account.organizationId === organizationId ? account.ownerMemberId : null;
  const [coverageGrants, ownerIsDirectReportOfActor] = await Promise.all([
    input.store.listCustomerCoverageGrants(organizationId, partyId),
    owner ? input.store.isDirectReport(organizationId, actorMemberId, owner, effectiveAt) : Promise.resolve(false),
  ]);
  const allowed = canActOnCustomer({
    action,
    actorMemberId,
    organizationId,
    customerPartyId: partyId,
    grantedScopes: [...input.snap.roleKeys, ...input.snap.delegatedScopes],
    accountOwnerMemberId: owner,
    ownerIsDirectReportOfActor,
    coverageGrants,
    asOf: effectiveAt,
  });
  if (!allowed) throw new Error('PERMISSION_DENIED');
}
