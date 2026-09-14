/**
 * A missing or unauthorized read is not an empty store.
 * UNPROVEN never collapses into zero stock, zero receipts, or zero facts.
 */

export const SOURCE_STATES = ['AVAILABLE', 'NO_FACT', 'UNPROVEN', 'ERROR'] as const;
export type SourceState = (typeof SOURCE_STATES)[number];

export const COMPANY_OPERATING_READ_SCOPE = 'management.org.read' as const;

/** Same field pulse uses. Organization comes only from trusted context. */
export const TENANT_PREDICATE_FIELD = 'organizationId' as const;

export type TenantPredicate = {
  field: typeof TENANT_PREDICATE_FIELD;
  organizationId: string;
};

export function tenantPredicate(organizationId: string): TenantPredicate {
  const id = organizationId.trim();
  if (!id) throw new Error('organization_required');
  return { field: TENANT_PREDICATE_FIELD, organizationId: id };
}

type ReadEnvelope = {
  capability: typeof COMPANY_OPERATING_READ_SCOPE;
  tenantPredicate: TenantPredicate | null;
  /** Never a computed stock figure. Null is not zero. */
  stockQuantity: null;
  officialStock: false;
  collapsedToZero: false;
  representAsZeroStock: false;
};

export type AvailableRead<T> = ReadEnvelope & {
  state: 'AVAILABLE';
  facts: T[];
  factCount: number;
  reason: null;
  reasonCode: null;
};

export type NoFactRead = ReadEnvelope & {
  state: 'NO_FACT';
  facts: [];
  factCount: 0;
  reason: 'empty_authorized_query' | 'missing';
  reasonCode: null;
};

export type UnprovenReasonCode =
  | 'NO_LIVE_READER'
  | 'unauthorized'
  | 'auth_required'
  | 'missing_model'
  | 'production_not_order_keyed'
  | 'not_stored'
  | 'CROSS_LANE_CHANGE_REQUEST';

export type UnprovenRead = ReadEnvelope & {
  state: 'UNPROVEN';
  facts: [];
  /** Null so an unauthorized or missing reader is not reported as zero facts. */
  factCount: null;
  reason: string;
  reasonCode: UnprovenReasonCode;
  detail: string;
};

export type ErrorRead = ReadEnvelope & {
  state: 'ERROR';
  facts: [];
  factCount: null;
  reason: 'query_failed';
  reasonCode: null;
};

export type ReadResult<T> = AvailableRead<T> | NoFactRead | UnprovenRead | ErrorRead;

export function availableFacts<T>(
  organizationId: string,
  facts: T[],
): AvailableRead<T> | NoFactRead {
  const predicate = tenantPredicate(organizationId);
  if (facts.length === 0) {
    return {
      state: 'NO_FACT',
      capability: COMPANY_OPERATING_READ_SCOPE,
      tenantPredicate: predicate,
      facts: [],
      factCount: 0,
      reason: 'empty_authorized_query',
      reasonCode: null,
      stockQuantity: null,
      officialStock: false,
      collapsedToZero: false,
      representAsZeroStock: false,
    };
  }
  return {
    state: 'AVAILABLE',
    capability: COMPANY_OPERATING_READ_SCOPE,
    tenantPredicate: predicate,
    facts,
    factCount: facts.length,
    reason: null,
    reasonCode: null,
    stockQuantity: null,
    officialStock: false,
    collapsedToZero: false,
    representAsZeroStock: false,
  };
}

export function missingFact(organizationId: string): NoFactRead {
  return {
    state: 'NO_FACT',
    capability: COMPANY_OPERATING_READ_SCOPE,
    tenantPredicate: tenantPredicate(organizationId),
    facts: [],
    factCount: 0,
    reason: 'missing',
    reasonCode: null,
    stockQuantity: null,
    officialStock: false,
    collapsedToZero: false,
    representAsZeroStock: false,
  };
}

export function unproven(input: {
  organizationId?: string | null;
  reasonCode: UnprovenReasonCode;
  reason: string;
  detail: string;
}): UnprovenRead {
  const organizationId = input.organizationId?.trim() ?? '';
  return {
    state: 'UNPROVEN',
    capability: COMPANY_OPERATING_READ_SCOPE,
    tenantPredicate: organizationId ? tenantPredicate(organizationId) : null,
    facts: [],
    factCount: null,
    reason: input.reason,
    reasonCode: input.reasonCode,
    detail: input.detail,
    stockQuantity: null,
    officialStock: false,
    collapsedToZero: false,
    representAsZeroStock: false,
  };
}

export function queryFailed(organizationId: string): ErrorRead {
  return {
    state: 'ERROR',
    capability: COMPANY_OPERATING_READ_SCOPE,
    tenantPredicate: tenantPredicate(organizationId),
    facts: [],
    factCount: null,
    reason: 'query_failed',
    reasonCode: null,
    stockQuantity: null,
    officialStock: false,
    collapsedToZero: false,
    representAsZeroStock: false,
  };
}
