import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { buildComprasQueue, type ComprasQueueModel } from '@/lib/purchasing/queue';
import { comprasRepository } from '@/lib/purchasing/repository';

/**
 * Loads the session tenant's purchasing queue.
 * The session view has no cargo grant. A missing purchasing role is permission, not an empty leak.
 * CROSS_LANE: member scope assignment is not on the session view. Do not infer it from a title.
 */
export async function loadComprasQueue(query?: {
  q?: string | null;
  buyer?: string | null;
}): Promise<ComprasQueueModel> {
  try {
    const auth = await getServerOsAuthContext();
    if (!auth) return { state: 'permission', reason: 'session_org_required' };
    const client = createOsApiClient(auth);
    const session = await client.getAuthenticatedSession();
    const organizationId = session.organizationId?.trim() ?? '';
    if (!organizationId) return { state: 'permission', reason: 'session_org_required' };
    return buildComprasQueue({
      session: comprasRepository.sessionFor(organizationId),
      requests: comprasRepository.requests(),
      candidates: comprasRepository.candidates(),
      query: query?.q,
      buyerQuery: query?.buyer,
    });
  } catch {
    return { state: 'error', reason: 'load_failed' };
  }
}
