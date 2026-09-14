/**
 * Matches Worker 6's proposed read scope. Local only: do not assign it here,
 * and do not treat people.admin or commercial.org.read as this scope.
 */
export const MANAGEMENT_ORG_READ_SCOPE = 'management.org.read' as const;

export type ManagementOrgReadScope = typeof MANAGEMENT_ORG_READ_SCOPE;

export function viewerHasManagementOrgRead(roleKeys: readonly string[]): boolean {
  return roleKeys.includes(MANAGEMENT_ORG_READ_SCOPE);
}
