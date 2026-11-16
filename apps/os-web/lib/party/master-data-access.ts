import { acceptTrustedMemberContext } from '@isalwa/os-domain';
import type { OsApiClient } from '@/lib/api/os-api-client';
import { hasMasterDataAdminScope } from '@/lib/party/customer-self-service';

/**
 * Effective scopes from GET /session/authorization only.
 * /session/me and GET /members/:id are not a grant source.
 */
export async function loadActorRoleKeys(client: OsApiClient): Promise<string[]> {
  try {
    const payload = await client.getTrustedAuthorization();
    const context = acceptTrustedMemberContext(payload);
    return context ? [...context.grantedScopes] : [];
  } catch {
    return [];
  }
}

export async function actorCanMutateMasterData(client: OsApiClient): Promise<boolean> {
  const grantedScopes = await loadActorRoleKeys(client);
  return hasMasterDataAdminScope(grantedScopes);
}

/** Advisor registration (`commercial.customer.create`) or data steward. Server still enforces CreateParty. */
export async function actorCanCreateCustomer(client: OsApiClient): Promise<boolean> {
  const grantedScopes = await loadActorRoleKeys(client);
  return grantedScopes.includes('commercial.customer.create') || hasMasterDataAdminScope(grantedScopes);
}
