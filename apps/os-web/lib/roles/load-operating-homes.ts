import type {
  AttentionItemReadModel,
  QuoteSummaryReadModel,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import type { OsApiClient } from '@/lib/api/os-api-client';
import { quoteHref } from '@/lib/commercial/navigation';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';
import { composeOperatingHomes, type OperatingHomesModel, type QueueRecord } from '@/lib/roles/homes';
import type { Visibility } from '@/lib/roles/access';
import { attentionTargetHref, workItemHref } from '@/lib/work/navigation';

const FOLLOW_UP_SUBJECTS = new Set(['party', 'commercial_account']);

type Lists = {
  ownQuotes?: readonly QuoteSummaryReadModel[];
  teamQuotes?: readonly QuoteSummaryReadModel[];
  ownWork?: readonly WorkSummaryReadModel[];
  teamWork?: readonly WorkSummaryReadModel[];
  attention?: readonly AttentionItemReadModel[];
};

function quoteRecord(quote: QuoteSummaryReadModel, visibility: Visibility): QueueRecord {
  return {
    id: quote.quoteId,
    organizationId: quote.organizationId,
    ownerMemberId: quote.ownerMemberId,
    partyId: quote.partyId,
    visibility,
    kind: 'quote',
    subject: quote.quoteNumber.trim() || 'Cotización',
    href: quoteHref(quote.partyId, quote.quoteId),
  };
}

function workRecord(work: WorkSummaryReadModel, visibility: Visibility): QueueRecord | null {
  if (!work.subjectType || !FOLLOW_UP_SUBJECTS.has(work.subjectType)) return null;
  return {
    id: work.workItemId,
    organizationId: work.organizationId,
    ownerMemberId: work.ownerMemberId,
    partyId: work.subjectType === 'party' ? work.subjectId : null,
    visibility,
    kind: 'follow-up',
    subject: work.title.trim() || 'Seguimiento',
    href: workItemHref(work.workItemId),
  };
}

function attentionRecord(item: AttentionItemReadModel): QueueRecord | null {
  const kind =
    item.attentionType === 'pending_approval'
      ? 'approval'
      : item.subjectType && FOLLOW_UP_SUBJECTS.has(item.subjectType)
        ? 'follow-up'
        : null;
  if (!kind) return null;
  return {
    id: item.attentionKey,
    organizationId: item.organizationId,
    ownerMemberId: item.memberId,
    partyId: item.subjectType === 'party' ? item.subjectId : null,
    visibility: 'own',
    kind,
    subject: kind === 'approval' ? 'Aprobación en espera' : 'Seguimiento',
    href: attentionTargetHref(item),
  };
}

export async function loadOperatingHomes(
  client: Pick<OsApiClient, 'getAuthenticatedSession' | 'getMember'>,
  lists: Lists = {},
): Promise<OperatingHomesModel> {
  try {
    const session = await client.getAuthenticatedSession();
    const grantedScopes = await loadActorRoleKeys(client as OsApiClient);
    const records = [
      ...(lists.ownQuotes ?? []).map((quote) => quoteRecord(quote, 'own')),
      ...(lists.teamQuotes ?? []).map((quote) => quoteRecord(quote, 'team')),
      ...(lists.ownWork ?? []).flatMap((work) => {
        const row = workRecord(work, 'own');
        return row ? [row] : [];
      }),
      ...(lists.teamWork ?? []).flatMap((work) => {
        const row = workRecord(work, 'team');
        return row ? [row] : [];
      }),
      ...(lists.attention ?? []).flatMap((item) => {
        const row = attentionRecord(item);
        return row ? [row] : [];
      }),
    ];
    return composeOperatingHomes({
      session: {
        organizationId: session.organizationId,
        actorMemberId: session.memberId,
        grantedScopes,
      },
      records,
    });
  } catch {
    return composeOperatingHomes({ session: null });
  }
}
