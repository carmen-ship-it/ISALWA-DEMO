import { getServerWebSession, getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { createOsApiClient } from '@/lib/api/os-api-client';
import {
  buildCoordinationPageModel,
  coordinationFactsForSession,
  type CoordinationPageModel,
} from '@/lib/coordination/page-model';
import type { CoordinationDecisionRecord } from '@isalwa/os-contracts';

/**
 * Hydrates Coordinación from the trusted member context + durable API ledger.
 *
 * Dev cookie and Supabase cookie both go through loadMemberCapabilities →
 * GET /session/authorization. getServerWebSession supplies display label only.
 * Cargo, title, and /session/me roleKeys are not grant sources.
 */
export async function loadCoordinationPage(): Promise<CoordinationPageModel> {
  const web = await getServerWebSession();
  const actorLabel =
    web?.displayLabel?.trim() ||
    (web?.mode === 'supabase' ? web.email?.trim() || null : null);

  const context = await loadMemberCapabilities();
  if (!context) {
    return buildCoordinationPageModel({
      session: {
        organizationId: null,
        actorMemberId: null,
        actorLabel,
        grantedCapabilities: [],
      },
      matters: [],
      decisions: [],
    });
  }

  let decisions: readonly CoordinationDecisionRecord[] = [];
  try {
    const auth = await getServerOsAuthContext();
    if (auth) {
      const client = createOsApiClient(auth);
      const payload = await client.listCoordinationDecisions();
      if (payload.organizationId === context.organizationId) {
        decisions = payload.decisions;
      }
    }
  } catch {
    // Permission or service failure → empty history, not another tenant's rows.
    decisions = [];
  }

  return buildCoordinationPageModel({
    session: {
      organizationId: context.organizationId,
      actorMemberId: context.memberId,
      actorLabel,
      grantedCapabilities: context.grantedScopes,
    },
    matters: coordinationFactsForSession(context.organizationId),
    decisions,
  });
}
