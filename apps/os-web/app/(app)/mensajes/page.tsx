import { ManualConversationPanel, type ManualConversationActor } from '@/components/conversations/manual-conversation-panel';
import { CapabilityLockedState } from '@/components/states/app-states';
import { PageContainer } from '@isalwa/ui';
import { CAPABILITY_PRESENTATION } from '@/lib/capabilities/presentation';
import { resolveNavItemFromCapabilities } from '@/lib/capabilities/resolve-nav';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext, getServerWebSession } from '@/lib/auth/actions';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

export default async function MensajesPage() {
  const auth = await getServerOsAuthContext();
  const presentation = CAPABILITY_PRESENTATION.messaging;
  let message = presentation.employeeMessage;

  let actor: ManualConversationActor | null = null;

  if (auth) {
    try {
      const client = createOsApiClient(auth);
      const { capabilities } = await client.getCapabilityState();
      const resolved = resolveNavItemFromCapabilities('/mensajes', capabilities);
      if (resolved.message) message = resolved.message;
      const session = await client.getAuthenticatedSession();
      const web = await getServerWebSession();
      const organizationId = session.organizationId?.trim() ?? '';
      const memberId = session.memberId?.trim() ?? '';
      const enteredByLabel = web?.displayLabel?.trim() || 'Alguien de la empresa';
      if (organizationId && memberId && session.accessStatus === 'active') {
        actor = { organizationId, memberId, enteredByLabel };
      }
    } catch {
      // keep the locked-channel message; the manual record still needs a company session
    }
  }

  return (
    <PageContainer label="Mensajes" className="flex min-h-[50vh] flex-col items-center gap-10 py-8" data-tour={TOUR_TARGET.messagesFuture}>
      <CapabilityLockedState message={message} />
      <ManualConversationPanel actor={actor} />
    </PageContainer>
  );
}
