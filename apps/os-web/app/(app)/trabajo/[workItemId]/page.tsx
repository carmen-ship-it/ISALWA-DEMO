import Link from 'next/link';
import { Button, PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { CompleteFollowUpForm } from '@/components/work/complete-follow-up-form';
import { CancelFollowUpForm } from '@/components/work/cancel-follow-up-form';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import {
  formatDueDate,
  formatPriority,
  formatSubjectType,
  formatTimestamp,
  formatWorkApprovalStatus,
  formatWorkStatus,
  isWorkOverdue,
  statusToneForWork,
} from '@/lib/work/labels';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { approvalHref } from '@/lib/work/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';
import { isFollowUpSubjectType, FOLLOW_UP_COPY, followUpStatusLabel } from '@/lib/work/follow-up';
import { partyHref } from '@/lib/party/navigation';
import { staffFacingSubject } from '@/lib/work/staff-subject';
import { QuotedProductContext } from '@/components/commercial/quoted-product-context';
import { parseOrderPrepMarker, visibleWorkDescription } from '@/components/commercial/order-prep-work';
import { orderHref, quoteHref } from '@/lib/commercial/navigation';
import { quotedProductsFromQuoteLines } from '@/lib/commercial/quoted-product-context';

type WorkDetailPageProps = {
  params: Promise<{ workItemId: string }>;
};

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { workItemId } = await params;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const { work, freshness } = await client.getWorkItem(workItemId);
    const memberLabels = await resolveMemberLabels(client, [
      work.ownerMemberId,
      work.createdByMemberId,
    ]);
    const overdue = isWorkOverdue(work);
    const subject = formatSubjectType(work.subjectType);
    const customerFollowUp = work.subjectType ? isFollowUpSubjectType(work.subjectType) : false;
    const partyId = work.subjectType === 'party' ? work.subjectId : null;
    const partyLabels = partyId ? await resolvePartyLabels(client, [partyId]) : null;
    const customerName = partyId && partyLabels ? partyLabel(partyLabels, partyId) : null;
    const staffTitle = staffFacingSubject({
      title: work.title,
      description: work.description,
      subjectType: work.subjectType,
      customerName: customerName && customerName !== 'Cliente' ? customerName : null,
    });
    const statusLabel = customerFollowUp ? followUpStatusLabel(work.status) : formatWorkStatus(work.status);
    const undatedOpen = work.status === 'open' && !work.dueAt;
    const completedAt = formatTimestamp(work.completedAt);
    const cancelledAt = formatTimestamp(work.cancelledAt);
    const description = visibleWorkDescription(work.description);
    const prep = parseOrderPrepMarker(work.description);
    let quotedProducts = quotedProductsFromQuoteLines([]);
    let quoteUnavailable = false;
    let quoteNumber: string | null = null;
    let quoteLink: string | null = null;
    let orderLink: string | null = null;
    let orderNumber: string | null = null;
    if (prep && partyId) {
      orderLink = orderHref(partyId, prep.orderId);
      try {
        const { order } = await client.getOrder(prep.orderId);
        orderNumber = order.orderNumber;
        if (order.quoteId) {
          quoteLink = quoteHref(partyId, order.quoteId);
          try {
            const pack = await client.getQuote(order.quoteId);
            quoteNumber = pack.quote.quoteNumber;
            quotedProducts = quotedProductsFromQuoteLines(pack.quote.lines);
          } catch {
            quoteUnavailable = true;
          }
        } else {
          quoteUnavailable = true;
        }
      } catch {
        quoteUnavailable = true;
      }
    }

    return (
      <PageContainer label={staffTitle}>
        <PageHeader
          kicker={customerFollowUp ? FOLLOW_UP_COPY.section : 'Trabajo'}
          title={staffTitle}
          action={
            <Link href="/trabajo">
              <Button type="button" variant="secondary">
                Volver a trabajo
              </Button>
            </Link>
          }
        />

        <StaleProjectionBanner freshness={freshness} />

        <PageSection card className="p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={statusToneForWork(work.status)}>{statusLabel}</StatusPill>
            {overdue ? <StatusPill tone="danger">Vencido</StatusPill> : null}
            {undatedOpen ? <StatusPill tone="neutral">Sin fecha</StatusPill> : null}
          </div>

          {description ? (
            <p className="mt-4 text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
              {description}
            </p>
          ) : null}

          <dl className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="isalwa-section-label">Quién es responsable</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {work.ownerMemberId
                  ? memberLabel(memberLabels, work.ownerMemberId)
                  : 'Aún no hay una persona responsable asignada.'}
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">{customerFollowUp ? FOLLOW_UP_COPY.due : 'Fecha'}</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatDueDate(work.dueAt)}</dd>
            </div>
            <div>
              <dt className="isalwa-section-label">{FOLLOW_UP_COPY.nextAction}</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">{work.title}</dd>
            </div>
            {customerName && partyId ? (
              <div>
                <dt className="isalwa-section-label">Cliente</dt>
                <dd className="mt-2">
                  <Link href={partyHref(partyId)} className="text-[var(--isalwa-glaze)] hover:underline">
                    {customerName}
                  </Link>
                </dd>
              </div>
            ) : subject ? (
              <div>
                <dt className="isalwa-section-label">Sobre</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{subject}</dd>
              </div>
            ) : null}
            {work.priority !== 'normal' ? (
              <div>
                <dt className="isalwa-section-label">Prioridad</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatPriority(work.priority)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="isalwa-section-label">Aprobación</dt>
              <dd className="mt-1 text-[var(--isalwa-kiln)]">
                {formatWorkApprovalStatus(work.approvalStatus)}
              </dd>
            </div>
            {work.pendingApprovalId ? (
              <div>
                <dt className="isalwa-section-label">Aprobación vinculada</dt>
                <dd className="mt-1">
                  <Link
                    href={approvalHref(work.pendingApprovalId)}
                    className="text-[var(--isalwa-glaze)] hover:underline"
                  >
                    Ver solicitud
                  </Link>
                </dd>
              </div>
            ) : null}
            {completedAt ? (
              <div>
                <dt className="isalwa-section-label">Completado</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{completedAt}</dd>
              </div>
            ) : null}
            {cancelledAt ? (
              <div>
                <dt className="isalwa-section-label">Cancelado</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{cancelledAt}</dd>
              </div>
            ) : null}
          </dl>
          {work.status === 'open' ? (
            <>
              <CompleteFollowUpForm workItemId={work.workItemId} partyId={partyId} />
              <CancelFollowUpForm workItemId={work.workItemId} partyId={partyId} />
            </>
          ) : null}
        </PageSection>

        {prep ? (
          <PageSection card className="mt-6 p-6 md:p-8">
            <QuotedProductContext
              lines={quotedProducts}
              quoteHref={quoteLink}
              quoteNumber={quoteNumber}
              orderHref={orderLink}
              orderNumber={orderNumber}
              unavailable={quoteUnavailable}
              showPrices={false}
            />
          </PageSection>
        ) : null}
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return (
        <PageContainer label="Trabajo">
          <QuerySurfaceState error={{ kind: 'unknown', message: 'No se encontró este trabajo.' }} />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Trabajo">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
