import { PageContainer, StatusPill } from '@isalwa/ui';
import { FinanceDisclaimer } from '@/components/finance/finance-disclaimer';
import { FinanceOperationalDesk } from '@/components/finance/finance-operational-desk';
import { PageHeader } from '@/components/shell/page-header';
import { OsApiError } from '@/lib/api/os-api-errors';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import {
  FINANCE_DESK_COPY,
  loadFinanceSubjectOptions,
  resolveFinancePageAccess,
} from '@/lib/finance';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';

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
 * Operational finance desk for Contabilidad.
 * Unlocks with finance.operational.record only.
 * Product capability `finance` remains LOCKED (no official ledger / Ingresos).
 */
export default async function FinanzasPage({ searchParams }: FinanzasPageProps) {
  const params = await searchParams;
  const access = await loadFinanceAccess();
  const subjectOptions =
    access.status === 'ready' ? await loadFinanceSubjectOptions() : { orders: [], quotes: [] };

  const prefillOrderId = one(params.orderId);
  const prefillPartyId = one(params.partyId);
  const prefillQuoteId = one(params.quoteId);

  let initialSubjectType: 'order' | 'party' | 'quote' | undefined;
  let initialSubjectId: string | undefined;
  let initialSubjectLabel: string | undefined;

  if (prefillOrderId) {
    const hit = subjectOptions.orders.find((option) => option.id === prefillOrderId);
    if (hit) {
      initialSubjectType = 'order';
      initialSubjectId = hit.id;
      initialSubjectLabel = hit.hint ? `${hit.label} · ${hit.hint}` : hit.label;
    }
  } else if (prefillQuoteId) {
    const hit = subjectOptions.quotes.find((option) => option.id === prefillQuoteId);
    if (hit) {
      initialSubjectType = 'quote';
      initialSubjectId = hit.id;
      initialSubjectLabel = hit.hint ? `${hit.label} · ${hit.hint}` : hit.label;
    }
  } else if (prefillPartyId) {
    initialSubjectType = 'party';
    initialSubjectId = prefillPartyId;
    initialSubjectLabel = '';
  }

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
          organizationId={access.organizationId}
          memberId={access.memberId}
          actorLabel={access.actorLabel}
          grantedScopes={access.grantedScopes}
          orderOptions={subjectOptions.orders}
          quoteOptions={subjectOptions.quotes}
          initialSubjectType={initialSubjectType}
          initialSubjectId={initialSubjectId}
          initialSubjectLabel={initialSubjectLabel}
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
