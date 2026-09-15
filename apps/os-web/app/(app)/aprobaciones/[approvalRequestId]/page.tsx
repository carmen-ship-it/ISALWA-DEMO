import Link from 'next/link';
import { PageContainer, PageSection, StatusPill } from '@isalwa/ui';
import { ApprovalDecisionForm } from '@/components/commercial/commercial-approval-panel';
import { PageHeader } from '@/components/shell/page-header';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { formatTimestamp } from '@/lib/commercial/labels';
import { orderHref, quoteHref } from '@/lib/commercial/navigation';
import type { SubjectApprovalItem } from '@/lib/commercial/types';
import { partyHref } from '@/lib/party/navigation';
import { partyLabel, resolvePartyLabels } from '@/lib/commercial/party-resolver';
import {
  formatApprovalStatus,
  formatSubjectType,
  statusToneForApproval,
} from '@/lib/work/labels';
import { approvalStaffSubject } from '@/lib/work/staff-subject';
import { memberLabel, resolveMemberLabels } from '@/lib/work/member-resolver';
import { workItemHref } from '@/lib/work/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';

type ApprovalDetailPageProps = {
  params: Promise<{ approvalRequestId: string }>;
};

const accentLinkClass =
  'isalwa-t-fast font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:text-[var(--isalwa-glaze-deep)] hover:underline';

export default async function ApprovalDetailPage({ params }: ApprovalDetailPageProps) {
  const { approvalRequestId } = await params;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const { approval, freshness } = await client.getApproval(approvalRequestId);
    const memberLabels = await resolveMemberLabels(client, [
      approval.requestedByMemberId,
      approval.approverMemberId,
      approval.decisionByMemberId ?? '',
    ]);
    const subject = formatSubjectType(approval.subjectType);
    const decidedAt = formatTimestamp(approval.decidedAt);
    const subjectLink = await resolveSubjectLink(client, approval.subjectType, approval.subjectId);
    const customerName = subjectLink?.partyId
      ? partyLabel(await resolvePartyLabels(client, [subjectLink.partyId]), subjectLink.partyId)
      : null;
    const title = approvalStaffSubject({
      subjectType: approval.subjectType,
      quoteNumber: approval.subjectType === 'quote' ? subjectLink?.label : null,
      orderNumber: approval.subjectType === 'order' ? subjectLink?.label : null,
      customerName: customerName && customerName !== 'Cliente' ? customerName : null,
    });
    const canDecide = await resolveCanDecide(client, approval);

    return (
      <PageContainer label="Aprobación">
        <PageHeader
          kicker="Aprobaciones"
          title={title}
          description="La decisión no crea un pedido."
          action={
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill tone={statusToneForApproval(approval.status)}>
                {formatApprovalStatus(approval.status)}
              </StatusPill>
              <Link href="/aprobaciones" className={accentLinkClass}>
                Volver
              </Link>
            </div>
          }
        />

        <StaleProjectionBanner freshness={freshness} />

        <PageSection card className="bg-white p-8 md:p-10">
          <dl className="grid gap-8 sm:grid-cols-2">
            <div>
              <dt className="isalwa-section-label">Solicitado por</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {memberLabel(memberLabels, approval.requestedByMemberId)}
              </dd>
            </div>
            <div>
              <dt className="isalwa-section-label">Aprobador</dt>
              <dd className="mt-2 text-[var(--isalwa-kiln)]">
                {memberLabel(memberLabels, approval.approverMemberId)}
              </dd>
            </div>
            {subject ? (
              <div>
                <dt className="isalwa-section-label">Asunto</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{subject}</dd>
              </div>
            ) : null}
            {customerName && customerName !== 'Cliente' ? (
              <div>
                <dt className="isalwa-section-label">Cliente</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{customerName}</dd>
              </div>
            ) : null}
            {subjectLink ? (
              <div>
                <dt className="isalwa-section-label">Registro</dt>
                <dd className="mt-2">
                  <Link href={subjectLink.href} className={accentLinkClass}>
                    {subjectLink.label}
                  </Link>
                </dd>
              </div>
            ) : null}
            {approval.workItemId ? (
              <div>
                <dt className="isalwa-section-label">Trabajo vinculado</dt>
                <dd className="mt-2">
                  <Link href={workItemHref(approval.workItemId)} className={accentLinkClass}>
                    Ver trabajo
                  </Link>
                </dd>
              </div>
            ) : null}
            {decidedAt ? (
              <div>
                <dt className="isalwa-section-label">Decidida</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{decidedAt}</dd>
              </div>
            ) : null}
            {approval.decisionReason ? (
              <div className="sm:col-span-2">
                <dt className="isalwa-section-label">Motivo</dt>
                <dd className="mt-2 text-[var(--isalwa-kiln)]">{approval.decisionReason}</dd>
              </div>
            ) : null}
          </dl>

          {canDecide || approval.status !== 'pending' ? (
            <div className="sticky bottom-0 z-10 mt-10 -mx-8 border-t border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_94%,white)] px-8 py-4 backdrop-blur-md md:-mx-10 md:px-10">
              <ApprovalDecisionForm
                partyId={subjectLink?.partyId}
                subjectType={approval.subjectType}
                subjectId={approval.subjectId}
                approvalRequestId={approval.approvalRequestId}
                locked={!canDecide || approval.status !== 'pending'}
              />
            </div>
          ) : (
            <p className="mt-10 text-sm leading-relaxed text-[var(--isalwa-slate)]" role="status">
              Solo el aprobador asignado puede decidir. Usted puede revisar el contexto.
            </p>
          )}
        </PageSection>
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return (
        <PageContainer label="Aprobación">
          <QuerySurfaceState
            error={{ kind: 'unknown', message: 'No se encontró esta aprobación.' }}
          />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Aprobación">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}

type SubjectLink = {
  href: string;
  label: string;
  partyId?: string;
};

async function resolveSubjectLink(
  client: ReturnType<typeof createOsApiClient>,
  subjectType: string,
  subjectId: string,
): Promise<SubjectLink | null> {
  if (!subjectId) return null;
  if (subjectType === 'quote') {
    try {
      const { quote } = await client.getQuote(subjectId);
      return {
        href: quoteHref(quote.partyId, quote.quoteId),
        label: quote.quoteNumber,
        partyId: quote.partyId,
      };
    } catch {
      return null;
    }
  }
  if (subjectType === 'order') {
    try {
      const { order } = await client.getOrder(subjectId);
      return {
        href: orderHref(order.partyId, order.orderId),
        label: order.orderNumber,
        partyId: order.partyId,
      };
    } catch {
      return null;
    }
  }
  if (subjectType === 'party') {
    return { href: partyHref(subjectId), label: 'Ver cliente', partyId: subjectId };
  }
  return null;
}

async function resolveCanDecide(
  client: ReturnType<typeof createOsApiClient>,
  approval: { approvalRequestId: string; subjectType: string; subjectId: string; status: string; approverMemberId: string },
): Promise<boolean> {
  if (approval.status !== 'pending') return false;
  if (approval.subjectType === 'quote' || approval.subjectType === 'order') {
    try {
      const history = await client.listSubjectApprovals(approval.subjectType, approval.subjectId);
      const match = (history.items as SubjectApprovalItem[]).find(
        (item) => item.approvalRequestId === approval.approvalRequestId,
      );
      return match?.canDecide === true;
    } catch {
      return false;
    }
  }
  try {
    const session = await client.getAuthenticatedSession();
    return session.memberId === approval.approverMemberId;
  } catch {
    return false;
  }
}
