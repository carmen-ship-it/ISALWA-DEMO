import {
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  canConfirmFinance,
  canPostFinanceLedger,
  canRecordOperationalFinance,
  scopesGrantedByCargoOrTitle,
} from '@isalwa/os-contracts';
import { FINANCE_DESK_COPY } from './copy';

export type FinanceDeskDenial =
  | 'no_session_org'
  | 'permission_unconfirmed'
  | 'unauthorized_role'
  | 'cross_tenant';

export type FinanceActorSession = {
  organizationId?: string | null;
  memberId?: string | null;
  accessStatus?: string | null;
  actorLabel?: string | null;
  grantedScopes?: readonly string[] | null;
  cargo?: string | null;
  title?: string | null;
};

export type FinancePageAccess =
  | {
      status: 'denied';
      reason: FinanceDeskDenial;
      organizationId: null;
      memberId: null;
      actorLabel: string;
      grantedScopes: readonly string[];
      canRecord: false;
      canConfirm: false;
      canPostLedger: false;
    }
  | {
      status: 'ready';
      reason: null;
      organizationId: string;
      memberId: string;
      actorLabel: string;
      grantedScopes: readonly string[];
      canRecord: true;
      canConfirm: false;
      canPostLedger: false;
    };

function blank(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function denied(reason: FinanceDeskDenial): FinancePageAccess {
  return {
    status: 'denied',
    reason,
    organizationId: null,
    memberId: null,
    actorLabel: 'Registro operativo',
    grantedScopes: [],
    canRecord: false,
    canConfirm: false,
    canPostLedger: false,
  };
}

/**
 * Route gate for /finanzas operational desk.
 * Product capability `finance` staying LOCKED is intentional (no official ledger).
 * This desk unlocks only with an explicit finance.operational.record assignment.
 * Cargo and title never grant access.
 */
export function resolveFinancePageAccess(input: {
  session: FinanceActorSession | null | undefined;
  grantedScopes: readonly string[] | null;
}): FinancePageAccess {
  const organizationId = blank(input.session?.organizationId);
  const memberId = blank(input.session?.memberId);
  const accessStatus = blank(input.session?.accessStatus) ?? 'active';

  if (!organizationId || !memberId || accessStatus !== 'active') {
    return denied('no_session_org');
  }

  if (input.grantedScopes === null) {
    return denied('permission_unconfirmed');
  }

  // Cargo/title are ignored on purpose. Empty array proves they grant nothing.
  void scopesGrantedByCargoOrTitle(input.session?.cargo, input.session?.title);

  if (!canRecordOperationalFinance(input.grantedScopes)) {
    return denied('unauthorized_role');
  }

  return {
    status: 'ready',
    reason: null,
    organizationId,
    memberId,
    actorLabel: blank(input.session?.actorLabel) ?? 'Contabilidad',
    grantedScopes: input.grantedScopes,
    canRecord: true,
    canConfirm: canConfirmFinance(input.grantedScopes),
    canPostLedger: canPostFinanceLedger(input.grantedScopes),
  };
}

export function financePermissionCopy(reason: FinanceDeskDenial): {
  title: string;
  description: string;
} {
  if (reason === 'unauthorized_role') {
    return {
      title: FINANCE_DESK_COPY.permissionTitle,
      description: FINANCE_DESK_COPY.permissionRole,
    };
  }
  if (reason === 'permission_unconfirmed') {
    return {
      title: FINANCE_DESK_COPY.permissionTitle,
      description: FINANCE_DESK_COPY.permissionUnconfirmed,
    };
  }
  return {
    title: FINANCE_DESK_COPY.permissionTitle,
    description: FINANCE_DESK_COPY.permissionSession,
  };
}

/**
 * Write gate for a reported payment fact. Same tenant + exact scope.
 * Never confirms ledger. Title alone is never enough.
 */
export function authorizeFinanceOperationalWrite(input: {
  session: FinanceActorSession | null | undefined;
  organizationId: string | null | undefined;
}): { ok: true } | { ok: false; reason: FinanceDeskDenial } {
  const sessionOrg = blank(input.session?.organizationId);
  const resourceOrg = blank(input.organizationId);
  if (!sessionOrg || blank(input.session?.memberId) == null) {
    return { ok: false, reason: 'no_session_org' };
  }
  if (!resourceOrg || sessionOrg !== resourceOrg) {
    return { ok: false, reason: 'cross_tenant' };
  }
  if (input.session?.grantedScopes == null) {
    return { ok: false, reason: 'permission_unconfirmed' };
  }
  void scopesGrantedByCargoOrTitle(input.session.cargo, input.session.title);
  if (!canRecordOperationalFinance(input.session.grantedScopes)) {
    return { ok: false, reason: 'unauthorized_role' };
  }
  return { ok: true };
}

export function financeOperationalRecordScope(): typeof FINANCE_OPERATIONAL_RECORD_SCOPE {
  return FINANCE_OPERATIONAL_RECORD_SCOPE;
}
