import { getServerWebSession } from '@/lib/auth/actions';
import {
  buildCoordinationPageModel,
  coordinationFactsForSession,
  coordinationGrantedCapabilitiesForSession,
  type CoordinationPageModel,
} from '@/lib/coordination/page-model';
import { unavailableOperatingFacts } from '@/lib/coordination/facts';

/**
 * Operating facts are generated only when a tenant-scoped query exists.
 * None of those readers exist in this lane. An empty committee is the honest
 * state. It is not a proof that operations were checked, and it is not filled
 * from an unscoped list or from another tenant.
 */
export async function loadCoordinationPage(): Promise<CoordinationPageModel> {
  const web = await getServerWebSession();
  const dev = web?.devSession;
  const organizationId = dev?.organizationId ?? null;
  const actorMemberId = dev?.memberId ?? null;
  const actorLabel = dev?.displayLabel?.trim() || (web?.mode === 'supabase' ? web.email ?? null : null);
  const facts = unavailableOperatingFacts();
  const generated = coordinationFactsForSession(organizationId);

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
    matters: generated.matters,
    facts,
    decisions: [],
  });
}
