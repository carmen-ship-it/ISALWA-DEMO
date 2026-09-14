import { getServerWebSession } from '@/lib/auth/actions';
import {
  buildCoordinationPageModel,
  coordinationFactsForSession,
  coordinationGrantedCapabilitiesForSession,
  type CoordinationPageModel,
} from '@/lib/coordination/page-model';

/**
 * The page shows only facts a caller passed. This seam returns none.
 * CROSS_LANE: pass factual triggers here. Do not invent a case, and do not
 * read another tenant to fill an empty committee.
 */
export async function loadCoordinationPage(): Promise<CoordinationPageModel> {
  const web = await getServerWebSession();
  const dev = web?.devSession;
  const organizationId = dev?.organizationId ?? null;
  const actorMemberId = dev?.memberId ?? null;
  const actorLabel = dev?.displayLabel?.trim() || (web?.mode === 'supabase' ? web.email ?? null : null);

  return buildCoordinationPageModel({
    session: {
      organizationId,
      actorMemberId,
      actorLabel,
      grantedCapabilities: coordinationGrantedCapabilitiesForSession({
        memberId: actorMemberId,
        displayLabel: actorLabel,
      }),
    },
    matters: coordinationFactsForSession(organizationId),
    decisions: [],
  });
}
