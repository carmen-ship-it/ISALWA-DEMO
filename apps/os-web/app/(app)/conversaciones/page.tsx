import { Suspense } from 'react';
import { PageContainer } from '@isalwa/ui';
import type { ManualConversationActor } from '@/components/conversations/manual-conversation-panel';
import { ConversationsWorkspace } from '@/components/conversations/conversations-workspace';
import { PageHeader } from '@/components/shell/page-header';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext, getServerWebSession } from '@/lib/auth/actions';
import { CONVERSATIONS_COPY } from '@/lib/conversations/copy';
import { projectManualConversation } from '@/lib/conversations/project-manual';
import type { Conversation } from '@/lib/conversations/model';
import {
  ignoredSuggestionIdsFromRecords,
  isSuggestionDecisionRecord,
} from '@/lib/conversations/suggestion-decision';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import {
  evaluationAllowsDesk,
  filterByCommercialOwner,
} from '@/lib/role-preview/evaluation-resource-access';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';

export default async function ConversacionesPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'conversations')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Conversaciones" />;
  }

  let actor: ManualConversationActor | null = null;
  let organizationId = '';
  let durableRows: Conversation[] = [];
  let ignoredSuggestionIdsByConversation: Record<string, string[]> = {};
  let allowedPartyIds: Set<string> | null = null;

  try {
    const client = createOsApiClient(auth);
    const session = await client.getAuthenticatedSession();
    const web = await getServerWebSession();
    organizationId = session.organizationId?.trim() ?? '';
    const memberId = session.memberId?.trim() ?? '';
    const enteredByLabel = web?.displayLabel?.trim() || 'Alguien de la empresa';
    if (organizationId && memberId && session.accessStatus === 'active') {
      actor = evaluation.active
        ? null
        : { organizationId, memberId, enteredByLabel };
    }
    if (evaluation.active && evaluation.persona === 'asesor') {
      const parties = await client.searchParties({ status: 'active', limit: 100 }).catch(() => ({ items: [] }));
      const owned = filterByCommercialOwner(
        evaluation,
        parties.items ?? [],
        (item) => item.commercialOwnerMemberId,
      );
      allowedPartyIds = new Set(owned.map((p) => p.partyId));
    }
    try {
      const listed = await client.listCustomerConversations();
      const items = listed.items ?? [];
      const decisionRows = items.filter(isSuggestionDecisionRecord);
      const threadRows = items.filter((row) => !isSuggestionDecisionRecord(row));
      for (const row of threadRows) {
        if (allowedPartyIds && !allowedPartyIds.has(row.customerId)) continue;
        const ignored = ignoredSuggestionIdsFromRecords(decisionRows, row.id);
        if (ignored.size > 0) {
          ignoredSuggestionIdsByConversation[row.id] = [...ignored];
        }
      }
      durableRows = threadRows
        .map(projectManualConversation)
        .filter((row) => !allowedPartyIds || allowedPartyIds.has(row.partyId));
    } catch {
      // API may be unavailable; the workspace shows its empty state.
    }
  } catch {
    // Session-bound page still renders; register form needs an active actor.
  }

  const initialConversations = organizationId
    ? durableRows.filter((row) => !allowedPartyIds || allowedPartyIds.has(row.partyId))
    : [];

  return (
    <PageContainer label={CONVERSATIONS_COPY.title}>
      <PageHeader
        kicker={CONVERSATIONS_COPY.kicker}
        title={CONVERSATIONS_COPY.title}
        description={CONVERSATIONS_COPY.description}
      />
      <Suspense fallback={<p className="text-sm text-[var(--isalwa-slate)]">Cargando conversaciones…</p>}>
        <ConversationsWorkspace
          actor={actor}
          initialConversations={initialConversations}
          ignoredSuggestionIdsByConversation={ignoredSuggestionIdsByConversation}
        />
      </Suspense>
    </PageContainer>
  );
}
