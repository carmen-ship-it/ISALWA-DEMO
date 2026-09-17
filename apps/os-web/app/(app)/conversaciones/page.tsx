import { Suspense } from 'react';
import { PageContainer, StatusPill } from '@isalwa/ui';
import type { ManualConversationActor } from '@/components/conversations/manual-conversation-panel';
import { ConversationsWorkspace } from '@/components/conversations/conversations-workspace';
import { PageHeader } from '@/components/shell/page-header';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext, getServerWebSession } from '@/lib/auth/actions';
import { listRegisteredConversationFixtures } from '@/lib/conversations/adapters';
import { CONVERSATIONS_COPY } from '@/lib/conversations/copy';
import { ownerDemoConversationFixtures } from '@/lib/conversations/demo-fixtures';
import { projectManualConversation } from '@/lib/conversations/project-manual';
import type { Conversation } from '@/lib/conversations/model';
import seededIds from '@/lib/demo/seeded-ids.json';
import { resolveDemoDataMode } from '@/lib/demo/resolve-demo-data-mode';

export default async function ConversacionesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const dataMode = await resolveDemoDataMode(params);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  let actor: ManualConversationActor | null = null;
  let organizationId = '';
  let durableRows: Conversation[] = [];

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
    try {
      const listed = await client.listCustomerConversations();
      durableRows = (listed.items ?? []).map(projectManualConversation);
    } catch {
      // API may be unavailable; fall back below.
    }
  } catch {
    // Session-bound page still renders; register form needs an active actor.
  }

  const seededClients = (seededIds.clients ?? [])
    .map((client) => {
      const key = (client as { key?: string; clientKey?: string }).key
        ?? (client as { key?: string; clientKey?: string }).clientKey;
      const partyId = (client as { partyId?: string }).partyId;
      if (!key || !partyId) return null;
      return {
        key,
        partyId,
        opportunityId: (client as { opportunityId?: string | null }).opportunityId ?? null,
        quoteId: (client as { quoteId?: string | null }).quoteId ?? null,
        quoteNumber: (client as { quoteNumber?: string | null }).quoteNumber ?? null,
        orderId: (client as { orderId?: string | null }).orderId ?? null,
        followUpWorkId: (client as { followUpWorkId?: string | null }).followUpWorkId ?? null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  // Prefer durable domain rows. JSON fixtures only fill gaps when Demo and no durable rows yet.
  const demoFixtures =
    dataMode === 'demo' && organizationId && durableRows.length === 0
      ? ownerDemoConversationFixtures(organizationId, seededClients)
      : [];

  const initialConversations = organizationId
    ? [
        ...durableRows,
        ...(dataMode === 'demo' ? [] : listRegisteredConversationFixtures(organizationId)),
        ...demoFixtures,
      ]
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
