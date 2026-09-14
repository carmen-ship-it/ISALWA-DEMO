import type { OsApiClient } from '@/lib/api/os-api-client';
import { hasMasterDataAdminScope } from '@/lib/party/customer-self-service';

export async function loadActorRoleKeys(client: OsApiClient): Promise<string[]> {
  try {
    const session = await client.getAuthenticatedSession();
    const member = await client.getMember(session.memberId);
    return member.summary?.roleKeys ?? [];
  } catch {
    return [];
  }
}

export async function actorCanMutateMasterData(client: OsApiClient): Promise<boolean> {
  const roleKeys = await loadActorRoleKeys(client);
  return hasMasterDataAdminScope(roleKeys);
}
