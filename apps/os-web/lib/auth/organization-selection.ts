/**
 * Organization context for the web app. Options come only from os-api
 * `/session/organizations` (proven active memberships). The cookie is a
 * preference among those options, never authority: os-api re-validates the
 * selector header on every request.
 */

export const SELECTED_ORGANIZATION_COOKIE = 'isalwa-selected-organization' as const;

export const SELECTED_ORGANIZATION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionOrganization = {
  organizationId: string;
  legalName: string;
};

export type OrganizationSelection =
  | { state: 'selected'; organizationId: string; organizations: SessionOrganization[] }
  | { state: 'choose'; organizations: SessionOrganization[]; staleSelection: boolean }
  | { state: 'none' };

/**
 * One option → use it. Several → keep a previous choice only while it is still
 * an option; otherwise the person must choose. None → honest no-access.
 */
export function resolveOrganizationSelection(
  organizations: readonly SessionOrganization[],
  previous: string | null | undefined,
): OrganizationSelection {
  const options = organizations.filter((org) => org.organizationId.trim());
  if (options.length === 0) return { state: 'none' };
  if (options.length === 1) {
    return { state: 'selected', organizationId: options[0]!.organizationId, organizations: [...options] };
  }
  const wanted = previous?.trim();
  if (wanted && options.some((org) => org.organizationId === wanted)) {
    return { state: 'selected', organizationId: wanted, organizations: [...options] };
  }
  return { state: 'choose', organizations: [...options], staleSelection: Boolean(wanted) };
}

/** A requested switch is accepted only when it names a current option. */
export function isSelectableOrganization(
  organizations: readonly SessionOrganization[],
  requested: string | null | undefined,
): boolean {
  const wanted = requested?.trim();
  return Boolean(wanted) && organizations.some((org) => org.organizationId === wanted);
}

/**
 * Browser state cleared when the organization changes. Persistent keys that
 * hold tenant data are already scoped by `organizationId:memberId` (actorKey),
 * so they rekey on their own; session storage holds unscoped transient drafts.
 */
export function clearTenantScopedBrowserState(win: Pick<Window, 'sessionStorage'>): void {
  try {
    win.sessionStorage.clear();
  } catch {
    // Storage unavailable: the full document navigation still drops in-memory state.
  }
}
