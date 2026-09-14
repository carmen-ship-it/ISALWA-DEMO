import type { ApprovalSummaryReadModel, AttentionItemReadModel } from '@isalwa/os-contracts';
import type { OsApiClient } from '@/lib/api/os-api-client';
import { partyLabel, resolvePartyLabels, type PartyLabelMap } from '@/lib/commercial/party-resolver';
import { attentionStaffSubject, approvalStaffSubject, isEngineeringFixtureCopy } from '@/lib/work/staff-subject';

export type StaffSubjectMap = Map<string, string>;

export async function resolveAttentionSubjects(
  client: OsApiClient,
  items: AttentionItemReadModel[],
): Promise<StaffSubjectMap> {
  const workIds = [...new Set(items.map((item) => item.workItemId).filter((id): id is string => Boolean(id)))];
  const quoteIds = [
    ...new Set(
      items.flatMap((item) => (item.subjectType === 'quote' && item.subjectId ? [item.subjectId] : [])),
    ),
  ];
  const partyIds = items.flatMap((item) =>
    item.subjectType === 'party' && item.subjectId ? [item.subjectId] : [],
  );

  const listed = await client.listWorkItems({ status: 'open', limit: 100 }).catch(() => null);
  const workById = new Map((listed?.items ?? []).map((work) => [work.workItemId, work]));
  await Promise.all(
    workIds
      .filter((id) => !workById.has(id))
      .slice(0, 25)
      .map(async (id) => {
        try {
          const { work } = await client.getWorkItem(id);
          workById.set(id, work);
        } catch {
          // Missing or unauthorized work stays without a title. Do not invent one.
        }
      }),
  );

  for (const work of workById.values()) {
    if (work.subjectType === 'party' && work.subjectId) partyIds.push(work.subjectId);
    if (work.subjectType === 'quote' && work.subjectId) quoteIds.push(work.subjectId);
  }

  const [partyLabels, quotes] = await Promise.all([
    resolvePartyLabels(client, partyIds),
    resolveQuotes(client, quoteIds),
  ]);

  const labels: StaffSubjectMap = new Map();
  for (const item of items) {
    const work = item.workItemId ? workById.get(item.workItemId) : undefined;
    const subjectType = item.subjectType ?? work?.subjectType ?? null;
    const subjectId = item.subjectId ?? work?.subjectId ?? null;
    const quote = subjectType === 'quote' && subjectId ? quotes.get(subjectId) : undefined;
    const customerId = quote?.partyId ?? (subjectType === 'party' ? subjectId : null);
    const sourceTitle =
      (typeof item.reasonDetail.title === 'string' ? item.reasonDetail.title : null) ?? work?.title ?? null;
    const subject = attentionStaffSubject(item, {
      title: sourceTitle,
      description: work?.description,
      customerName: knownPartyName(partyLabels, customerId),
      reference: quote?.quoteNumber,
    });
    const fixtureOnly = isEngineeringFixtureCopy(sourceTitle) && !subject.includes(' · ');
    labels.set(item.attentionKey, fixtureOnly || isEngineeringFixtureCopy(subject) ? '' : subject);
  }
  return labels;
}

export async function resolveApprovalSubjects(
  client: OsApiClient,
  approvals: ApprovalSummaryReadModel[],
): Promise<StaffSubjectMap> {
  const quoteIds = approvals.flatMap((item) =>
    item.subjectType === 'quote' && item.subjectId ? [item.subjectId] : [],
  );
  const orderIds = approvals.flatMap((item) =>
    item.subjectType === 'order' && item.subjectId ? [item.subjectId] : [],
  );
  const workIds = approvals.flatMap((item) => (item.workItemId ? [item.workItemId] : []));

  const [quotes, orders, works] = await Promise.all([
    resolveQuotes(client, quoteIds),
    resolveOrders(client, orderIds),
    resolveWorks(client, workIds),
  ]);

  const partyIds = [
    ...[...quotes.values()].map((quote) => quote.partyId),
    ...[...orders.values()].map((order) => order.partyId),
    ...approvals.flatMap((item) => (item.subjectType === 'party' && item.subjectId ? [item.subjectId] : [])),
  ];
  const partyLabels = await resolvePartyLabels(client, partyIds);

  const labels: StaffSubjectMap = new Map();
  for (const approval of approvals) {
    const quote = approval.subjectType === 'quote' ? quotes.get(approval.subjectId) : undefined;
    const order = approval.subjectType === 'order' ? orders.get(approval.subjectId) : undefined;
    const work = approval.workItemId ? works.get(approval.workItemId) : undefined;
    const customerId = quote?.partyId ?? order?.partyId ?? (approval.subjectType === 'party' ? approval.subjectId : null);
    const customerName = knownPartyName(partyLabels, customerId);
    const fixtureSubject =
      quote?.status === 'cancelled' ||
      isEngineeringFixtureCopy(customerName) ||
      isEngineeringFixtureCopy(work?.title);
    labels.set(
      approval.approvalRequestId,
      fixtureSubject
        ? ''
        : approvalStaffSubject({
            subjectType: approval.subjectType,
            quoteNumber: quote?.quoteNumber,
            orderNumber: order?.orderNumber,
            customerName,
            workTitle: work?.title,
          }),
    );
  }
  return labels;
}

function knownPartyName(labels: PartyLabelMap, partyId: string | null | undefined): string | null {
  if (!partyId || !labels.has(partyId)) return null;
  const name = partyLabel(labels, partyId);
  return name === 'Cliente' ? null : name;
}

async function resolveQuotes(client: OsApiClient, quoteIds: string[]) {
  const unique = [...new Set(quoteIds.filter(Boolean))];
  const rows = await Promise.all(
    unique.map(async (quoteId) => {
      try {
        const { quote } = await client.getQuote(quoteId);
        return [quote.quoteId, quote] as const;
      } catch {
        return null;
      }
    }),
  );
  return new Map(rows.filter((row): row is NonNullable<typeof row> => row !== null));
}

async function resolveOrders(client: OsApiClient, orderIds: string[]) {
  const unique = [...new Set(orderIds.filter(Boolean))];
  const rows = await Promise.all(
    unique.map(async (orderId) => {
      try {
        const { order } = await client.getOrder(orderId);
        return [order.orderId, order] as const;
      } catch {
        return null;
      }
    }),
  );
  return new Map(rows.filter((row): row is NonNullable<typeof row> => row !== null));
}

async function resolveWorks(client: OsApiClient, workIds: string[]) {
  const unique = [...new Set(workIds.filter(Boolean))].slice(0, 25);
  const rows = await Promise.all(
    unique.map(async (workItemId) => {
      try {
        const { work } = await client.getWorkItem(workItemId);
        return [work.workItemId, work] as const;
      } catch {
        return null;
      }
    }),
  );
  return new Map(rows.filter((row): row is NonNullable<typeof row> => row !== null));
}
