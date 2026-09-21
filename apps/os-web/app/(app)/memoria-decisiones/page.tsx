import Link from 'next/link';
import { ListPageNav } from '@/components/lists/list-page-nav';
import type { ApprovalSummaryReadModel } from '@isalwa/os-contracts';
import { EmptyState, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { createOsApiClient, type OsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import { loadCoordinationPage } from '@/lib/coordination/load';
import { approvalSubjectsForItems } from '@/lib/work/approval-row-subject';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { cursorPageLinks } from '@/lib/lists/url-state';

const APPROVAL_MEMORY_LIMIT = 25;

function approvalDecisionLabel(item: ApprovalSummaryReadModel): string {
  if (item.status === 'approved') return 'Aprobación concedida';
  if (item.status === 'rejected') return 'Aprobación rechazada';
  return 'Decisión registrada';
}

type MemoriaPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MemoriaDecisionesPage({ searchParams }: MemoriaPageProps) {
  const params = await searchParams;
  const cursor = typeof params.cursor === 'string' ? params.cursor : undefined;
  const trail = typeof params.trail === 'string' ? params.trail : undefined;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const [approvalsResult, coordination] = await Promise.all([
    client.listApprovals({
      limit: APPROVAL_MEMORY_LIMIT,
      status: 'decided',
      ...(cursor ? { cursor } : {}),
    }),
    loadCoordinationPage(),
  ]);

  const decided = approvalsResult.items.filter(
    (item) => item.status === 'approved' || item.status === 'rejected',
  );

  const subjects = await approvalSubjectsForPage(client, decided);
  const memberIds = decided.flatMap((item) =>
    [item.requestedByMemberId, item.approverMemberId, item.decisionByMemberId].filter(
      (id): id is string => Boolean(id),
    ),
  );
  const memberLabels = await resolveMemberLabels(client, memberIds);

  const coordinationDecisions = coordination.ledger.decisions;

  const empty = decided.length === 0 && coordinationDecisions.length === 0;

  return (
    <PageContainer label="Memoria de decisiones">
      <PageHeader
        kicker="Decisiones"
        title="Memoria de decisiones"
        description="Aprobaciones decididas y decisiones de coordinación ya registradas. No crea un archivo nuevo."
        action={
          <Link href="/aprobaciones" className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
            Aprobaciones pendientes
          </Link>
        }
      />

      {empty ? (
        <EmptyState
          title="Sin decisiones recientes"
          description="Cuando se apruebe o rechace una solicitud, o se registre una decisión de coordinación, aparecerá aquí."
        />
      ) : (
        <div className="space-y-10">
          {decided.length > 0 ? (
            <PageSection aria-label="Aprobaciones decididas">
              <h2 className="text-sm font-medium text-[var(--isalwa-kiln)]">Aprobaciones</h2>
              <ul className="mt-4 divide-y divide-[var(--isalwa-mist)]">
                {decided.map((item) => {
                  const subject = subjects.get(item.approvalRequestId);
                  const decider = item.decisionByMemberId
                    ? memberLabel(memberLabels, item.decisionByMemberId)
                    : memberLabel(memberLabels, item.approverMemberId);
                  return (
                    <li key={item.approvalRequestId} className="py-4 first:pt-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <StatusPill tone={item.status === 'approved' ? 'approved' : 'rejected'}>
                            {item.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                          </StatusPill>
                          <p className="text-sm font-semibold text-[var(--isalwa-kiln)]">
                            {approvalDecisionLabel(item)}
                          </p>
                        </div>
                        {item.decidedAt ? (
                          <time className="text-xs text-[var(--isalwa-slate)]" dateTime={item.decidedAt}>
                            {new Date(item.decidedAt).toLocaleString('es-BO', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </time>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                        {subjects.get(item.approvalRequestId) ?? 'Asunto comercial'} · {decider}
                      </p>
                      {item.decisionReason?.trim() ? (
                        <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
                          {item.decisionReason.trim()}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </PageSection>
          ) : null}

          
          {(() => {
            const nav = cursorPageLinks(
              '/memoria-decisiones',
              { cursor, trail },
              approvalsResult.meta?.nextCursor ?? null,
              Boolean(approvalsResult.meta?.hasMore),
            );
            return nav.prevHref || nav.nextHref ? (
              <ListPageNav
                from={decided.length > 0 ? 1 : 0}
                to={decided.length}
                total={null}
                page={1}
                pageCount={null}
                prevHref={nav.prevHref}
                nextHref={nav.nextHref}
              />
            ) : null;
          })()}

          {coordinationDecisions.length > 0 ? (
            <PageSection aria-label="Coordinación">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-medium text-[var(--isalwa-kiln)]">Coordinación</h2>
                <StatusPill tone="neutral">Comité</StatusPill>
              </div>
              <ul className="mt-4 divide-y divide-[var(--isalwa-mist)]">
                {coordinationDecisions.map((row) => (
                  <li key={row.id} className="py-4 first:pt-0">
                    <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{row.decision}</p>
                    {row.notes?.trim() ? (
                      <p className="mt-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">{row.notes.trim()}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-[var(--isalwa-slate)]">
                      {new Date(row.recordedAt).toLocaleString('es-BO', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                      {row.actorLabel ? ` · ${row.actorLabel}` : null}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm">
                <Link href="/coordinacion" className="font-medium text-[var(--isalwa-glaze)] hover:underline">
                  Ver coordinación
                </Link>
              </p>
            </PageSection>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}

async function approvalSubjectsForPage(
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

function isClosedSubjectRead(err: unknown): boolean {
  return err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'not_found' || err.kind === 'unauthorized');
}
