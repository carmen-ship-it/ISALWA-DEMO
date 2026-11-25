import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { buildComprasQueue, type ComprasQueueModel } from '@/lib/purchasing/queue';

/**
 * Loads the session tenant's purchasing queue from durable API.
 * Grants come only from GET /session/authorization via loadMemberCapabilities.
 * Cargo/title and identity-only /session/me are not grant sources.
 * Does not invent rows when the API returns empty.
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

    const client = createOsApiClient(auth);
    let requests: Awaited<ReturnType<typeof client.listPurchaseRequests>>['requests'] = [];
    try {
      const page = await client.listPurchaseRequests();
      requests = page.requests ?? [];
    } catch (err) {
      if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
        return { state: 'permission' };
      }
      return { state: 'error', reason: 'load_failed' };
    }

    return buildComprasQueue({
      session: {
        organizationId: context.organizationId,
        role: 'buyer',
        grantedScopes: context.grantedScopes,
        actorLabel: null,
      },
      requests,
      candidates: [],
      query: query?.q,
      buyerQuery: query?.buyer,
      statusFilter: query?.estado,
    });
  } catch {
    return { state: 'error', reason: 'load_failed' };
  }
}
