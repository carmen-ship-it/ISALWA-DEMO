import { ManualConversationPanel, type ManualConversationActor } from '@/components/conversations/manual-conversation-panel';
import { CapabilityLockedState } from '@/components/states/app-states';
import { PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
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
    <PageContainer label="Mensajes" data-tour={TOUR_TARGET.messagesFuture}>
      <PageHeader
        kicker="Mensajes"
        title="Mensajes todavía no está conectado"
        description="El canal automático de WhatsApp no está habilitado todavía. Puede dejar un registro manual de lo hablado."
        action={<StatusPill tone="demo">Canal no conectado</StatusPill>}
      />

      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="min-w-0">
          <CapabilityLockedState message={message} />
        </div>
        <PageSection
          card
          className="min-w-0 bg-[color-mix(in_srgb,var(--isalwa-porcelain)_35%,white)] p-5 shadow-[var(--isalwa-shadow-resting)] md:p-7"
        >
          <ManualConversationPanel actor={actor} />
        </PageSection>
      </div>
    </PageContainer>
  );
}
