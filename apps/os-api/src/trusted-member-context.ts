import type { Request } from 'express';
import type { TrustedContextResult, TrustedMembershipReader } from '@isalwa/os-domain';
import { resolveAuthenticatedProviderSubject, resolveRequestTrustedContext } from './os-session';

type TrustedContextStore = TrustedMembershipReader &
  Parameters<typeof resolveAuthenticatedProviderSubject>[1];

/**
 * Builds the one trusted member context for a live API request.
 *
 * Provider proof stays in resolveAuthenticatedProviderSubject. Membership,
 * lifecycle, and stored grants stay in resolveTrustedMemberContext.
 * x-os-organization-id may select among memberships already proven for that
 * person. Query and body organizationId, scope arrays, cargo, and title grant
 * nothing. A matching context is attached on the request for Gate A's reader.
 */
export async function loadTrustedMemberContextFromRequest(
  req: Request,
  store: TrustedContextStore,
): Promise<TrustedContextResult> {
  return resolveRequestTrustedContext(req, store);
}
