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
import {
  postApprovalContinue,
  POST_APPROVAL_CONVERT_LABEL,
  POST_APPROVAL_QUOTE_LINK_LABEL,
} from '@/lib/commercial/post-approval-continue';

/** CROSS_LANE: add 'approvalActions' to TOUR_TARGET in lib/walkthrough/targets.ts */
const APPROVAL_ACTIONS_TARGET = 'approval-actions';
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
    const continueCue = await resolvePostApprovalContinue(client, approval, subjectLink);

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

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
          <PageSection
            card
            className="order-2 border-[color-mix(in_srgb,var(--isalwa-glaze)_14%,var(--isalwa-mist))] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_35%,white)] p-6 shadow-[var(--isalwa-shadow-resting)] lg:order-1 md:p-8"
          >
            <p className="isalwa-kicker">Su decisión</p>
            <h2 className="mt-2 font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
              {approval.status === 'pending' ? 'Aprobar o rechazar' : 'Decisión registrada'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
              La decisión no crea un pedido. Solo confirma o rechaza esta solicitud.
            </p>
            {canDecide || approval.status !== 'pending' ? (
              <div className="mt-6" data-tour={APPROVAL_ACTIONS_TARGET}>
                <ApprovalDecisionForm
                  partyId={subjectLink?.partyId}
                  subjectType={approval.subjectType}
                  subjectId={approval.subjectId}
                  approvalRequestId={approval.approvalRequestId}
                  locked={!canDecide || approval.status !== 'pending'}
                />
              </div>
            ) : (
              <p className="mt-6 text-sm leading-relaxed text-[var(--isalwa-slate)]" role="status">
                Solo el aprobador asignado puede decidir. Usted puede revisar el contexto.
              </p>
            )}
            {continueCue?.showContinue ? (
              <div className="mt-8 space-y-3 border-t border-[var(--isalwa-mist)] pt-6" data-tour="post-approval-continue">
                {continueCue.decisionLabel ? (
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                    Decisión: {continueCue.decisionLabel}
                  </p>
                ) : null}
                {continueCue.stateExplanation ? (
                  <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
                    {continueCue.stateExplanation}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-4">
                  {continueCue.quoteHref && continueCue.quoteLinkLabel ? (
                    <Link href={continueCue.quoteHref} className={accentLinkClass}>
                      {continueCue.quoteLinkLabel || POST_APPROVAL_QUOTE_LINK_LABEL}
                    </Link>
                  ) : null}
                  {continueCue.convertHref && continueCue.convertLabel ? (
                    <Link href={continueCue.convertHref} className={accentLinkClass}>
                      {continueCue.convertLabel || POST_APPROVAL_CONVERT_LABEL}
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </PageSection>

          <PageSection card className="order-1 p-6 shadow-[var(--isalwa-shadow-soft)] lg:order-2 md:p-8">
            <p className="isalwa-section-label">Contexto</p>
            <dl className="mt-4 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="isalwa-section-label">Solicitado por</dt>
                <dd className="mt-1.5 text-[var(--isalwa-kiln)]">
                  {memberLabel(memberLabels, approval.requestedByMemberId)}
                </dd>
              </div>
              <div>
                <dt className="isalwa-section-label">Aprobador</dt>
                <dd className="mt-1.5 text-[var(--isalwa-kiln)]">
                  {memberLabel(memberLabels, approval.approverMemberId)}
                </dd>
              </div>
              {subject ? (
                <div>
                  <dt className="isalwa-section-label">Asunto</dt>
                  <dd className="mt-1.5 text-[var(--isalwa-kiln)]">{subject}</dd>
                </div>
              ) : null}
              {customerName && customerName !== 'Cliente' ? (
                <div>
                  <dt className="isalwa-section-label">Cliente</dt>
                  <dd className="mt-1.5 text-[var(--isalwa-kiln)]">{customerName}</dd>
                </div>
              ) : null}
              {subjectLink ? (
                <div>
                  <dt className="isalwa-section-label">Registro</dt>
                  <dd className="mt-1.5">
                    <Link href={subjectLink.href} className={accentLinkClass}>
                      {subjectLink.label}
                    </Link>
                  </dd>
                </div>
              ) : null}
              {approval.workItemId ? (
                <div>
                  <dt className="isalwa-section-label">Trabajo vinculado</dt>
                  <dd className="mt-1.5">
                    <Link href={workItemHref(approval.workItemId)} className={accentLinkClass}>
                      Ver trabajo
                    </Link>
                  </dd>
                </div>
              ) : null}
              {decidedAt ? (
                <div>
                  <dt className="isalwa-section-label">Decidida</dt>
                  <dd className="mt-1.5 text-[var(--isalwa-kiln)]">{decidedAt}</dd>
                </div>
              ) : null}
              {approval.decisionReason ? (
                <div className="sm:col-span-2">
                  <dt className="isalwa-section-label">Motivo</dt>
                  <dd className="mt-1.5 text-[var(--isalwa-kiln)]">{approval.decisionReason}</dd>
                </div>
              ) : null}
            </dl>
          </PageSection>
        </div>
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

async function resolvePostApprovalContinue(
  client: ReturnType<typeof createOsApiClient>,
  approval: { status: string; subjectType: string; subjectId: string },
  subjectLink: SubjectLink | null,
) {
  if (approval.status !== 'approved' && approval.status !== 'rejected') {
    return postApprovalContinue({
      approvalStatus: approval.status,
      subjectType: approval.subjectType,
      quoteStatus: null,
      canConvertToOrder: false,
      partyId: subjectLink?.partyId ?? null,
      quoteId: approval.subjectType === 'quote' ? approval.subjectId : null,
    });
  }
  if (approval.subjectType !== 'quote' || !subjectLink?.partyId) {
    return postApprovalContinue({
      approvalStatus: approval.status,
      subjectType: approval.subjectType,
      quoteStatus: null,
      canConvertToOrder: false,
      partyId: subjectLink?.partyId ?? null,
      quoteId: null,
    });
  }
  try {
    const { quote } = await client.getQuote(approval.subjectId);
    return postApprovalContinue({
      approvalStatus: approval.status,
      subjectType: approval.subjectType,
      quoteStatus: quote.status,
      canConvertToOrder: Boolean(quote.canConvertToOrder),
      partyId: quote.partyId,
      quoteId: quote.quoteId,
    });
  } catch {
    return postApprovalContinue({
      approvalStatus: approval.status,
      subjectType: approval.subjectType,
      quoteStatus: null,
      canConvertToOrder: false,
      partyId: subjectLink.partyId,
      quoteId: approval.subjectId,
    });
  }
}
