import type { OsApiClient } from '@/lib/api/os-api-client';
import { memberDisplayName } from '@/lib/workforce/labels';

export type MemberOption = { memberId: string; label: string };

export async function loadMemberOptionsForAdmin(client: OsApiClient): Promise<MemberOption[]> {
  try {
    const allowed = await client.probeAdminAccess();
    if (!allowed) return [];
    const { items } = await client.listMembers({ limit: 50, accessStatus: 'active' });
    return items.map((item) => ({
      memberId: item.memberId,
      label: memberDisplayName(item.displayName, item.givenName, item.familyName),
    }));
  } catch {
    return [];
  }
}
