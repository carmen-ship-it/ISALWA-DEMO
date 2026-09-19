import type { OsApiClient } from '@/lib/api/os-api-client';
import { demoPersonCargo, presentHumanCopy } from '@/lib/demo/human-facing-copy';
import type { MemberDetailResponse } from '@/lib/workforce/types';
import { resolveCargoForDisplay } from '@/lib/work/staff-display';

export type MemberLabelMap = Map<string, string>;

export type MemberResponsibilityLabel = {
  displayName: string;
  /** Evidenced Cargo / department — display context only, never authority. */
  businessRoleLabel: string | null;
};

export type MemberResponsibilityMap = Map<string, MemberResponsibilityLabel>;

function storedPersonLabel(response: MemberDetailResponse): string {
  if (response.summary) {
    const trimmed = response.summary.displayName.trim();
    if (trimmed) return trimmed;
    const composed = [response.summary.givenName, response.summary.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return composed || 'Sin nombre';
  }
  const name = [response.person.givenName, response.person.familyName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || 'Miembro del equipo';
}

function cargoFromResponse(response: MemberDetailResponse): string | null {
  return resolveCargoForDisplay({
    roleKeys: response.summary?.roleKeys ?? [],
    departmentName: response.summary?.departmentName ?? null,
  });
}

export async function resolveMemberLabels(
  client: OsApiClient,
  memberIds: Iterable<string>,
): Promise<MemberLabelMap> {
  const rich = await resolveMemberResponsibilityLabels(client, memberIds);
  return new Map([...rich.entries()].map(([id, row]) => [id, row.displayName]));
}

/**
 * Name + evidenced Cargo/department for responsibility display.
 * Does not map Cargo/title to scopes.
 */
export async function resolveMemberResponsibilityLabels(
  client: OsApiClient,
  memberIds: Iterable<string>,
): Promise<MemberResponsibilityMap> {
  const unique = [...new Set([...memberIds].filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (memberId) => {
      try {
        const response = await client.getMember(memberId);
        const storedName = storedPersonLabel(response);
        return [
          memberId,
          {
            displayName: presentHumanCopy(storedName) || 'Miembro del equipo',
            businessRoleLabel: demoPersonCargo(storedName) ?? cargoFromResponse(response),
          },
        ] as const;
      } catch {
        return [
          memberId,
          { displayName: 'Miembro del equipo', businessRoleLabel: null },
        ] as const;
      }
    }),
  );
  return new Map(entries);
}

export function memberLabel(map: MemberLabelMap, memberId: string): string {
  return map.get(memberId) ?? 'Miembro del equipo';
}

export function memberWithCargoLine(
  map: MemberResponsibilityMap,
  memberId: string,
): string {
  const row = map.get(memberId);
  if (!row) return 'Miembro del equipo';
  if (row.businessRoleLabel) return `${row.displayName} · ${row.businessRoleLabel}`;
  return row.displayName;
}
