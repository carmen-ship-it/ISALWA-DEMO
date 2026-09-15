import { getServerWebSession } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import {
  buildCoordinationPageModel,
  coordinationFactsForSession,
  type CoordinationPageModel,
} from '@/lib/coordination/page-model';

/**
 * Hydrates Coordinación from the trusted member context.
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

  return buildCoordinationPageModel({
    session: {
      organizationId: context.organizationId,
      actorMemberId: context.memberId,
      actorLabel,
      grantedCapabilities: context.grantedScopes,
    },
    matters: coordinationFactsForSession(context.organizationId),
    decisions: [],
  });
}
