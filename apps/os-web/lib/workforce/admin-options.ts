import type { OsApiClient } from '@/lib/api/os-api-client';
import { formatRoleKey, memberDisplayName } from '@/lib/workforce/labels';

export type SelectOption = { value: string; label: string };

export type MemberAdminOptions = {
  departments: SelectOption[];
  roles: SelectOption[];
};

function uniqueDepartments(
  items: Array<{ departmentId: string | null; departmentName: string | null }>,
): SelectOption[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    if (!item.departmentId) continue;
    seen.set(item.departmentId, item.departmentName?.trim() || item.departmentId);
  }
  return [...seen.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

function uniqueRoles(items: Array<{ roleKeys: string[] }>): SelectOption[] {
  const keys = new Set<string>();
  for (const item of items) {
    for (const key of item.roleKeys) keys.add(key);
  }
  return [...keys]
    .sort()
    .map((value) => ({ value, label: formatRoleKey(value) }));
}

/**
 * Derives small department/role enums from a bounded directory page.
 * Manager/delegate pickers use ServerMemberTypeahead (server search) — not this list.
 */
export async function loadMemberAdminOptions(
  client: OsApiClient,
  _targetMemberId: string,
): Promise<MemberAdminOptions> {
  const { items } = await client.listMembers({ limit: 100 });
  return {
    departments: uniqueDepartments(items),
    roles: uniqueRoles(items),
  };
}

/** Delegation scopes verified in workforce integration tests (not invented categories). */
export const DELEGATION_SCOPE_OPTIONS: SelectOption[] = [
  { value: 'approval.act', label: 'Actuar en aprobaciones delegadas' },
];

/** @deprecated Prefer ServerMemberTypeahead. Kept for display helpers only. */
export function memberSelectOptions(
  items: Array<{
    memberId: string;
    displayName: string;
    givenName: string;
    familyName: string;
    accessStatus: string;
  }>,
  excludeMemberId?: string,
): SelectOption[] {
  return items
    .filter((item) => item.memberId !== excludeMemberId && item.accessStatus === 'active')
    .map((item) => ({
      value: item.memberId,
      label: memberDisplayName(item.displayName, item.givenName, item.familyName),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}
