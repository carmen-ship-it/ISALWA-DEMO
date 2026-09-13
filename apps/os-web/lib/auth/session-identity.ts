export type AuthenticatedSessionView = {
  memberId: string;
  organizationId: string;
  accessStatus: 'active';
};

/**
 * Follow-up owner is the authenticated active member from the session read.
 * Caller owner and organization values are ignored.
 */
export function followUpOwnerFromAuthenticatedSession(
  session: {
    memberId?: string | null;
    organizationId?: string | null;
    accessStatus?: string | null;
  } | null,
  _caller?: {
    ownerMemberId?: unknown;
    organizationId?: unknown;
    attentionCount?: number;
    workCount?: number;
  },
): string | null {
  if (!session || session.accessStatus !== 'active') return null;
  const memberId = session.memberId?.trim() ?? '';
  if (!memberId) return null;
  return memberId;
}
