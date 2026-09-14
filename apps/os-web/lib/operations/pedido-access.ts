/**
 * Read gate for one Pedido, its lines, and its operational case.
 * Session organization is the tenant. A caller-supplied organization id is never authority.
 * Cargo and title grant nothing. Coverage of one customer does not open another.
 */

import {
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
  continueCoveredCustomerWorkflow,
  hasExplicitScope,
  scopesGrantedByCargoOrTitle,
  type CustomerCoverageGrant,
} from '@isalwa/os-contracts';

/** Jefe or Gerencia authorization. Explicit assignment only. Not inferred from cargo. */
export const COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE = 'commercial.exception.authorize' as const;

export type PedidoResource = 'order' | 'order_line' | 'operational_case';

export type PedidoSession = {
  organizationId: string | null;
  memberId: string;
  grantedScopes: readonly string[];
  cargo?: string | null;
  title?: string | null;
  asOf: Date;
};

export type AccessOrder = {
  organizationId: string;
  orderId: string;
  orderNumber: string;
  partyId: string;
  customerName: string;
  ownerMemberId: string;
  ownerLabel: string;
};

export type AccessOrderLine = {
  organizationId: string;
  orderId: string;
  orderLineId: string;
  description: string;
  quantity: number;
};

export type AccessOperationalCase = {
  organizationId: string;
  orderId: string;
  caseId: string;
  customerName: string;
  orderNumber: string;
  lineText: string;
  evidenceText: string;
};

export type PedidoAccessStore = {
  orders: readonly AccessOrder[];
  lines: readonly AccessOrderLine[];
  cases: readonly AccessOperationalCase[];
  grants: readonly CustomerCoverageGrant[];
};

export type ReadDenialReason =
  | 'missing_session_org'
  | 'cross_tenant'
  | 'unauthorized_role'
  | 'not_found';

export type ReadDenial = {
  ok: false;
  reason: ReadDenialReason;
};

export type AllowedOrderRead = {
  ok: true;
  resource: 'order';
  orderId: string;
  orderNumber: string;
  customerName: string;
  ownerMemberId: string;
  ownerLabel: string;
  sharedOwnership: false;
};

export type AllowedLineRead = {
  ok: true;
  resource: 'order_line';
  orderLineId: string;
  description: string;
  quantity: number;
  orderNumber: string;
  customerName: string;
};

export type AllowedCaseRead = {
  ok: true;
  resource: 'operational_case';
  caseId: string;
  evidenceText: string;
  orderNumber: string;
  customerName: string;
  lineText: string;
  confirmsPayment: false;
};

export type ResourceRead = AllowedOrderRead | AllowedLineRead | AllowedCaseRead | ReadDenial;

export type SearchResult =
  | { ok: true; resource: PedidoResource; hits: { label: string }[] }
  | { ok: false; reason: 'missing_session_org' | 'search_denied' };

export type AggregateResult =
  | { ok: true; resource: PedidoResource; count: number }
  | { ok: false; reason: 'missing_session_org' | 'aggregate_denied' };

const LEADERSHIP = [
  COMMERCIAL_TEAM_READ_SCOPE,
  COMMERCIAL_ORG_READ_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
] as const;

function deny(reason: ReadDenialReason): ReadDenial {
  return { ok: false, reason };
}

function sessionOrg(session: PedidoSession): string | null {
  const organizationId = session.organizationId?.trim() ?? '';
  return organizationId.length > 0 ? organizationId : null;
}

/** Cargo and title are ignored. They never add the exception scope or a customer grant. */
export function effectivePedidoScopes(session: PedidoSession): readonly string[] {
  void scopesGrantedByCargoOrTitle(session.cargo, session.title);
  return session.grantedScopes;
}

export function cargoGrantsExceptionAuthorization(
  cargo: string | null | undefined,
  title: string | null | undefined,
): false {
  const granted = scopesGrantedByCargoOrTitle(cargo, title);
  return hasExplicitScope(granted, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE) as false;
}

export function canAuthorizeCommercialException(session: PedidoSession): boolean {
  if (!sessionOrg(session)) return false;
  return hasExplicitScope(effectivePedidoScopes(session), COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE);
}

function hasLeadership(session: PedidoSession): boolean {
  const scopes = effectivePedidoScopes(session);
  return LEADERSHIP.some((scope) => hasExplicitScope(scopes, scope));
}

function covered(
  session: PedidoSession,
  order: AccessOrder,
  grants: readonly CustomerCoverageGrant[],
): boolean {
  const organizationId = sessionOrg(session);
  if (!organizationId) return false;
  return continueCoveredCustomerWorkflow({
    actorMemberId: session.memberId,
    organizationId,
    customerPartyId: order.partyId,
    primaryOwnerMemberId: order.ownerMemberId,
    grants,
    asOf: session.asOf,
  }).allowed;
}

function canReadOrder(
  session: PedidoSession,
  order: AccessOrder,
  grants: readonly CustomerCoverageGrant[],
): boolean {
  if (session.memberId === order.ownerMemberId) return true;
  if (covered(session, order, grants)) return true;
  return hasLeadership(session);
}

function canReadLine(
  session: PedidoSession,
  order: AccessOrder,
  grants: readonly CustomerCoverageGrant[],
): boolean {
  return canReadOrder(session, order, grants);
}

function canReadCase(
  session: PedidoSession,
  order: AccessOrder,
  grants: readonly CustomerCoverageGrant[],
): boolean {
  if (canReadOrder(session, order, grants)) return true;
  const scopes = effectivePedidoScopes(session);
  return (
    hasExplicitScope(scopes, FINANCE_OPERATIONAL_RECORD_SCOPE) ||
    hasExplicitScope(scopes, COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE)
  );
}

function parentOrder(
  store: PedidoAccessStore,
  organizationId: string,
  orderId: string,
): AccessOrder | null {
  return (
    store.orders.find((order) => order.organizationId === organizationId && order.orderId === orderId) ??
    null
  );
}

function sameTenant(session: PedidoSession, organizationId: string): 'ok' | ReadDenialReason {
  const current = sessionOrg(session);
  if (!current) return 'missing_session_org';
  if (current !== organizationId) return 'cross_tenant';
  return 'ok';
}

export function readPedidoResource(
  resource: PedidoResource,
  session: PedidoSession,
  store: PedidoAccessStore,
  id: string,
  requestedOrganizationId?: string | null,
): ResourceRead {
  void requestedOrganizationId;
  if (resource === 'order') return readOrder(session, store, id);
  if (resource === 'order_line') return readLine(session, store, id);
  return readCase(session, store, id);
}

function readOrder(session: PedidoSession, store: PedidoAccessStore, orderId: string): ResourceRead {
  const order = store.orders.find((item) => item.orderId === orderId);
  if (!order) return deny('not_found');
  const tenant = sameTenant(session, order.organizationId);
  if (tenant !== 'ok') return deny(tenant);
  if (!canReadOrder(session, order, store.grants)) return deny('unauthorized_role');
  return {
    ok: true,
    resource: 'order',
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    ownerMemberId: order.ownerMemberId,
    ownerLabel: order.ownerLabel,
    sharedOwnership: false,
  };
}

function readLine(session: PedidoSession, store: PedidoAccessStore, orderLineId: string): ResourceRead {
  const line = store.lines.find((item) => item.orderLineId === orderLineId);
  if (!line) return deny('not_found');
  const tenant = sameTenant(session, line.organizationId);
  if (tenant !== 'ok') return deny(tenant);
  const order = parentOrder(store, line.organizationId, line.orderId);
  if (!order || !canReadLine(session, order, store.grants)) return deny('unauthorized_role');
  return {
    ok: true,
    resource: 'order_line',
    orderLineId: line.orderLineId,
    description: line.description,
    quantity: line.quantity,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
  };
}

function readCase(session: PedidoSession, store: PedidoAccessStore, caseId: string): ResourceRead {
  const operationalCase = store.cases.find((item) => item.caseId === caseId);
  if (!operationalCase) return deny('not_found');
  const tenant = sameTenant(session, operationalCase.organizationId);
  if (tenant !== 'ok') return deny(tenant);
  const order = parentOrder(store, operationalCase.organizationId, operationalCase.orderId);
  if (!order || !canReadCase(session, order, store.grants)) return deny('unauthorized_role');
  return {
    ok: true,
    resource: 'operational_case',
    caseId: operationalCase.caseId,
    evidenceText: operationalCase.evidenceText,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    lineText: operationalCase.lineText,
    confirmsPayment: false,
  };
}

function queryMatches(query: string, fields: readonly string[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;
  return fields.some((field) => field.toLowerCase().includes(needle));
}

export function searchPedidoResource(
  resource: PedidoResource,
  session: PedidoSession,
  store: PedidoAccessStore,
  query: string,
  requestedOrganizationId?: string | null,
): SearchResult {
  void requestedOrganizationId;
  if (!sessionOrg(session)) return { ok: false, reason: 'missing_session_org' };
  const needle = query.trim();
  if (!needle) return { ok: false, reason: 'search_denied' };

  if (resource === 'order') {
    const matched = store.orders.filter((order) =>
      queryMatches(needle, [order.customerName, order.orderNumber, order.ownerLabel]),
    );
    if (
      matched.some(
        (order) => sameTenant(session, order.organizationId) !== 'ok' || !canReadOrder(session, order, store.grants),
      )
    ) {
      return { ok: false, reason: 'search_denied' };
    }
    return {
      ok: true,
      resource,
      hits: matched.map((order) => ({ label: `${order.customerName} · ${order.orderNumber}` })),
    };
  }

  if (resource === 'order_line') {
    const matched = store.lines.filter((line) => {
      const order = parentOrder(store, line.organizationId, line.orderId);
      return queryMatches(needle, [line.description, order?.customerName ?? '', order?.orderNumber ?? '']);
    });
    if (
      matched.some((line) => {
        const order = parentOrder(store, line.organizationId, line.orderId);
        return (
          sameTenant(session, line.organizationId) !== 'ok' ||
          !order ||
          !canReadLine(session, order, store.grants)
        );
      })
    ) {
      return { ok: false, reason: 'search_denied' };
    }
    return { ok: true, resource, hits: matched.map((line) => ({ label: line.description })) };
  }

  const matched = store.cases.filter((item) =>
    queryMatches(needle, [item.customerName, item.orderNumber, item.lineText, item.evidenceText]),
  );
  if (
    matched.some((item) => {
      const order = parentOrder(store, item.organizationId, item.orderId);
      return (
        sameTenant(session, item.organizationId) !== 'ok' ||
        !order ||
        !canReadCase(session, order, store.grants)
      );
    })
  ) {
    return { ok: false, reason: 'search_denied' };
  }
  return { ok: true, resource, hits: matched.map((item) => ({ label: item.evidenceText })) };
}

export function aggregatePedidoResource(
  resource: PedidoResource,
  session: PedidoSession,
  store: PedidoAccessStore,
  request: { requestedOrganizationId?: string | null; partyId?: string | null } = {},
): AggregateResult {
  if (!sessionOrg(session)) return { ok: false, reason: 'missing_session_org' };
  const requested = request.requestedOrganizationId?.trim();
  if (requested && requested !== sessionOrg(session)) {
    return { ok: false, reason: 'aggregate_denied' };
  }

  const partyId = request.partyId?.trim() || null;
  if (partyId) {
    const sample = store.orders.find(
      (order) => order.organizationId === sessionOrg(session) && order.partyId === partyId,
    );
    if (!sample || !canSee(resource, session, sample, store.grants)) {
      return { ok: false, reason: 'aggregate_denied' };
    }
  }

  if (resource === 'order') {
    return { ok: true, resource, count: store.orders.filter((order) => countedOrder(session, order, store, partyId)).length };
  }
  if (resource === 'order_line') {
    return {
      ok: true,
      resource,
      count: store.lines.filter((line) => {
        const order = parentOrder(store, line.organizationId, line.orderId);
        return order ? countedLine(session, order, store, partyId) : false;
      }).length,
    };
  }
  return {
    ok: true,
    resource,
    count: store.cases.filter((item) => {
      const order = parentOrder(store, item.organizationId, item.orderId);
      return order ? countedCase(session, order, store, partyId) : false;
    }).length,
  };
}

function canSee(
  resource: PedidoResource,
  session: PedidoSession,
  order: AccessOrder,
  grants: readonly CustomerCoverageGrant[],
): boolean {
  if (resource === 'operational_case') return canReadCase(session, order, grants);
  if (resource === 'order_line') return canReadLine(session, order, grants);
  return canReadOrder(session, order, grants);
}

function countedOrder(
  session: PedidoSession,
  order: AccessOrder,
  store: PedidoAccessStore,
  partyId: string | null,
): boolean {
  if (sameTenant(session, order.organizationId) !== 'ok') return false;
  if (partyId && order.partyId !== partyId) return false;
  return canReadOrder(session, order, store.grants);
}

function countedLine(
  session: PedidoSession,
  order: AccessOrder,
  store: PedidoAccessStore,
  partyId: string | null,
): boolean {
  return countedOrder(session, order, store, partyId);
}

function countedCase(
  session: PedidoSession,
  order: AccessOrder,
  store: PedidoAccessStore,
  partyId: string | null,
): boolean {
  if (sameTenant(session, order.organizationId) !== 'ok') return false;
  if (partyId && order.partyId !== partyId) return false;
  return canReadCase(session, order, store.grants);
}
