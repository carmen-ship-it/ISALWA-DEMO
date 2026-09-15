import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { buildComprasQueue, type ComprasQueueModel } from '@/lib/purchasing/queue';
import { comprasRepository } from '@/lib/purchasing/repository';

/**
 * Loads the session tenant's purchasing queue.
 * Grants come only from GET /session/authorization via loadMemberCapabilities.
 * Cargo/title and identity-only /session/me are not grant sources.
 * CROSS_LANE: a hosted persistence adapter is not owned here. Do not invent rows.
 */
export async function loadComprasQueue(query?: {
  q?: string | null;
  buyer?: string | null;
  estado?: string | null;
}): Promise<ComprasQueueModel> {
  try {
    const auth = await getServerOsAuthContext();
    if (!auth) return { state: 'permission', reason: 'session_org_required' };
    const context = await loadMemberCapabilities();
    if (!context) return { state: 'permission', reason: 'session_org_required' };

    // Keep local process rows tenant-scoped; role map is optional when scopes grant queue.
    const remembered = comprasRepository.sessionFor(context.organizationId);
    return buildComprasQueue({
      session: {
        organizationId: context.organizationId,
        role: remembered.role,
        grantedScopes: context.grantedScopes,
        actorLabel: null,
      },
      requests: comprasRepository.requests(),
      candidates: comprasRepository.candidates(),
      query: query?.q,
      buyerQuery: query?.buyer,
      statusFilter: query?.estado,
    });
  } catch {
    return { state: 'error', reason: 'load_failed' };
  }
}
