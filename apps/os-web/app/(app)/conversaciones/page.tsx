import { Suspense } from 'react';
import { PageContainer, StatusPill } from '@isalwa/ui';
import type { ManualConversationActor } from '@/components/conversations/manual-conversation-panel';
import { ConversationsWorkspace } from '@/components/conversations/conversations-workspace';
import { PageHeader } from '@/components/shell/page-header';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext, getServerWebSession } from '@/lib/auth/actions';
import { listRegisteredConversationFixtures } from '@/lib/conversations/adapters';
import { CONVERSATIONS_COPY } from '@/lib/conversations/copy';

export default async function ConversacionesPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  let actor: ManualConversationActor | null = null;
  let organizationId = '';

  try {
    const client = createOsApiClient(auth);
    const session = await client.getAuthenticatedSession();
    const web = await getServerWebSession();
    organizationId = session.organizationId?.trim() ?? '';
    const memberId = session.memberId?.trim() ?? '';
    const enteredByLabel = web?.displayLabel?.trim() || 'Alguien de la empresa';
    if (organizationId && memberId && session.accessStatus === 'active') {
      actor = { organizationId, memberId, enteredByLabel };
    }
  } catch {
    // Session-bound page still renders; register form needs an active actor.
  }

  const initialConversations = organizationId
    ? listRegisteredConversationFixtures(organizationId)
    : [];

  return (
    <PageContainer label={CONVERSATIONS_COPY.title}>
      <PageHeader
        kicker={CONVERSATIONS_COPY.kicker}
        title={CONVERSATIONS_COPY.title}
        description={CONVERSATIONS_COPY.description}
        action={<StatusPill tone="demo">Canal no conectado</StatusPill>}
      />
      <Suspense fallback={<p className="text-sm text-[var(--isalwa-slate)]">Cargando conversaciones…</p>}>
        <ConversationsWorkspace actor={actor} initialConversations={initialConversations} />
      </Suspense>
    </PageContainer>
  );
}
