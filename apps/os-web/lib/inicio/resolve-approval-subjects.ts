import type { ApprovalSummaryReadModel } from '@isalwa/os-contracts';
import type { OsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { approvalSubjectsForItems } from '@/lib/work/approval-row-subject';

function isClosedSubjectRead(err: unknown): boolean {
  return (
    err instanceof OsApiError &&
    (err.kind === 'forbidden' || err.kind === 'not_found' || err.kind === 'unauthorized')
  );
}

async function readQuoteSubject(
  client: OsApiClient,
  subjectId: string,
  cache: Map<string, { quoteNumber: string; partyId: string }>,
) {
  const cached = cache.get(subjectId);
  if (cached) return cached;
  try {
    const { quote } = await client.getQuote(subjectId);
    const row = { quoteNumber: quote.quoteNumber, partyId: quote.partyId };
    cache.set(subjectId, row);
    return row;
  } catch (err) {
    if (isClosedSubjectRead(err)) return null;
    throw err;
  }
}

async function readOrderSubject(
  client: OsApiClient,
  subjectId: string,
  cache: Map<string, { orderNumber: string; partyId: string }>,
) {
  const cached = cache.get(subjectId);
  if (cached) return cached;
  try {
    const { order } = await client.getOrder(subjectId);
    const row = { orderNumber: order.orderNumber, partyId: order.partyId };
    cache.set(subjectId, row);
    return row;
  } catch (err) {
    if (isClosedSubjectRead(err)) return null;
    throw err;
  }
}

export async function resolveInicioApprovalSubjects(
  client: OsApiClient,
  items: ApprovalSummaryReadModel[],
): Promise<Map<string, string>> {
  const quotes = new Map<string, { quoteNumber: string; partyId: string }>();
  const orders = new Map<string, { orderNumber: string; partyId: string }>();

  return approvalSubjectsForItems(items, async (item) => {
    if (item.subjectType === 'quote') {
      const quote = await readQuoteSubject(client, item.subjectId, quotes);
      if (!quote) return null;
      const customer = partyLabel(await resolvePartyLabels(client, [quote.partyId]), quote.partyId);
      return { quoteNumber: quote.quoteNumber, customerName: customer };
    }
    if (item.subjectType === 'order') {
      const order = await readOrderSubject(client, item.subjectId, orders);
      if (!order) return null;
      const customer = partyLabel(await resolvePartyLabels(client, [order.partyId]), order.partyId);
      return { orderNumber: order.orderNumber, customerName: customer };
    }
    return null;
  });
}
