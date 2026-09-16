import { PEOPLE_ADMIN_SCOPE, canUseQaAccess, hasAssignedOperationsScope } from '@isalwa/os-contracts';
import { hasMasterDataAdminScope } from '@/lib/party/customer-self-service';
import { readActiveQaView } from '@/lib/qa/actions';

export type QaShellOverlay = {
  grantedScopes: string[];
  showAdmin: boolean;
  canCreateCustomer: boolean;
  personaLabel: string;
};

/**
 * When a signed QA view cookie matches the signed-in member, shell labeling
 * follows the SYNTH persona scopes. API calls remain the operator session.
 */
export async function resolveQaShellOverlay(
  actingMemberId: string | null | undefined,
  operatorScopes: readonly string[],
): Promise<QaShellOverlay | null> {
  const actorId = actingMemberId?.trim();
  if (!actorId || !canUseQaAccess(operatorScopes)) return null;

  const active = await readActiveQaView();
  if (!active?.persona || active.payload.actingMemberId !== actorId) return null;

  const scopes = [...active.persona.grantedScopes];
  return {
    grantedScopes: scopes,
    showAdmin: hasAssignedOperationsScope(scopes, PEOPLE_ADMIN_SCOPE),
    canCreateCustomer: hasMasterDataAdminScope(scopes),
    personaLabel: active.persona.label,
  };
}
