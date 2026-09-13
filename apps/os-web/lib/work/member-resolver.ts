import type { OsApiClient } from '@/lib/api/os-api-client';
import type { MemberDetailResponse } from '@/lib/workforce/types';
import { memberDisplayName } from '@/lib/workforce/labels';

export type MemberLabelMap = Map<string, string>;

function personLabelFromResponse(response: MemberDetailResponse): string {
  if (response.summary) {
    return memberDisplayName(
      response.summary.displayName,
      response.summary.givenName,
      response.summary.familyName,
    );
  }
  const name = [response.person.givenName, response.person.familyName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || 'Miembro del equipo';
}

export async function resolveMemberLabels(
  client: OsApiClient,
  memberIds: Iterable<string>,
): Promise<MemberLabelMap> {
  const unique = [...new Set([...memberIds].filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (memberId) => {
      try {
        const response = await client.getMember(memberId);
        return [memberId, personLabelFromResponse(response)] as const;
      } catch {
        return [memberId, 'Miembro del equipo'] as const;
      }
    }),
  );
  return new Map(entries);
}

export function memberLabel(map: MemberLabelMap, memberId: string): string {
  return map.get(memberId) ?? 'Miembro del equipo';
}
