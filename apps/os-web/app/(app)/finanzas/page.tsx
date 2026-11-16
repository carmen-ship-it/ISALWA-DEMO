import { PageContainer, StatusPill } from '@isalwa/ui';
import { FinanceDisclaimer } from '@/components/finance/finance-disclaimer';
import { FinanceOperationalDesk } from '@/components/finance/finance-operational-desk';
import { PageHeader } from '@/components/shell/page-header';
import { OsApiError } from '@/lib/api/os-api-errors';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import {
  FINANCE_DESK_COPY,
  resolveFinancePageAccess,
} from '@/lib/finance';
import { loadFinancePrefill } from '@/lib/finance/load-prefill';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { evaluationAllowsDesk } from '@/lib/role-preview/evaluation-resource-access';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';

/** CROSS_LANE: add 'financeProvenance' to TOUR_TARGET in lib/walkthrough/targets.ts */
const FINANCE_PROVENANCE_TARGET = 'finance-provenance';

type FinanzasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    const trimmed = value[0].trim();
    return trimmed || null;
  }
  return null;
}

/**
 * Operational finance desk for Contabilidad: reported payments and their human verification.
 * Unlocks with an explicit assignment (payments.report, payments.confirm, payment-instruction
 * publication or finance.operational.record). Cargo and title never unlock it.
 * Product capability `finance` remains LOCKED (no official ledger / Ingresos).
 */
export default async function FinanzasPage({ searchParams }: FinanzasPageProps) {
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'finanzas')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Finanzas" />;
  }
  const params = await searchParams;
  const access = await loadFinanceAccess();
  const prefill =
    access.status === 'ready'
      ? await loadFinancePrefill({ partyId: one(params.partyId), orderId: one(params.orderId) })
      : null;

  return (
    <PageContainer label={FINANCE_DESK_COPY.title} data-tour={FINANCE_PROVENANCE_TARGET}>
      <PageHeader
        kicker={FINANCE_DESK_COPY.kicker}
        title={FINANCE_DESK_COPY.title}
        description={FINANCE_DESK_COPY.intro}
        action={<StatusPill tone="warning">Pendiente de confirmar</StatusPill>}
      />
      <FinanceDisclaimer />
      {access.status === 'ready' ? (
        <FinanceOperationalDesk
          status="ready"
          canReport={access.canReport}
          canVerify={access.canVerify}
          canPublishInstructions={access.canPublishInstructions}
          initialCustomerId={prefill?.customerId}
          initialCustomerLabel={prefill?.customerLabel}
          initialOrderId={prefill?.orderId}
          mutationsBlocked={evaluation.active}
        />
      ) : (
        <FinanceOperationalDesk status="denied" reason={access.reason} />
      )}
    </PageContainer>
  );
}

async function loadFinanceAccess() {
  try {
    const auth = await getServerOsAuthContext();
    if (!auth) {
      return resolveFinancePageAccess({ session: null, grantedScopes: null });
    }
    const client = createOsApiClient(auth);
    const session = await client.getAuthenticatedSession();
    const grantedScopes = await loadActorRoleKeys(client);
    return resolveFinancePageAccess({
      session: {
        organizationId: session.organizationId,
        memberId: session.memberId,
        accessStatus: session.accessStatus,
        actorLabel: 'Contabilidad',
        grantedScopes,
      },
      grantedScopes,
    });
  } catch (error) {
    if (error instanceof OsApiError && (error.kind === 'unauthorized' || error.kind === 'forbidden')) {
      return resolveFinancePageAccess({ session: null, grantedScopes: null });
    }
    return resolveFinancePageAccess({ session: null, grantedScopes: null });
  }
}
