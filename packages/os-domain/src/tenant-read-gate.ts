import { assertTenantMatch } from './authorization';

/**
 * Same assigned-scope strings as @isalwa/os-contracts. Inlined so this lane
 * does not rebuild or edit contracts. Matching follows scopeImplies: a held
 * scope satisfies only that exact scope.
 */
const COMMERCIAL_TEAM_READ_SCOPE = 'commercial.team.read';
const DELIVERY_RECORD_SCOPE = 'delivery.record';
const MANAGEMENT_ORG_READ_SCOPE = 'management.org.read';
const MASTER_DATA_ADMIN_SCOPE = 'master_data.admin';
const OPERATIONS_COORDINATOR_RECORD_SCOPE = 'operations.coordinator.record';
const PRODUCTION_OPERATIONAL_RECORD_SCOPE = 'production.operational.record';
const PURCHASING_OPERATIONAL_RECORD_SCOPE = 'purchasing.operational.record';
const WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE = 'warehouse.finished_goods.receive';

export const TENANT_SURFACES = [
  'customer',
  'contact',
  'opportunity',
  'quote',
  'quote_line',
  'order',
  'order_line',
  'product',
  'price_list',
  'price_entry',
  'production_record',
  'quema',
  'loss',
  'consumption',
  'finished_goods_receipt',
  'order_allocation',
  'purchase_request',
  'operational_case',
  'customer_communication',
  'warehouse_exit',
  'delivery',
  'delivery_note',
  'coordination_decision',
  'work_item',
  'attention',
  'global_search',
  'management_command_center',
] as const;

export type TenantSurface = (typeof TENANT_SURFACES)[number];

export const TENANT_DENIAL_CODES = ['TENANT_FORBIDDEN', 'ROLE_FORBIDDEN', 'AUTH_REQUIRED'] as const;

export type TenantDenialCode = (typeof TENANT_DENIAL_CODES)[number];

/** Existing assigned scopes only. A sibling scope does not authorize the surface. */
export const TENANT_SURFACE_REQUIRED_SCOPE = {
  customer: COMMERCIAL_TEAM_READ_SCOPE,
  contact: COMMERCIAL_TEAM_READ_SCOPE,
  opportunity: COMMERCIAL_TEAM_READ_SCOPE,
  quote: COMMERCIAL_TEAM_READ_SCOPE,
  quote_line: COMMERCIAL_TEAM_READ_SCOPE,
  order: COMMERCIAL_TEAM_READ_SCOPE,
  order_line: COMMERCIAL_TEAM_READ_SCOPE,
  product: MASTER_DATA_ADMIN_SCOPE,
  price_list: MASTER_DATA_ADMIN_SCOPE,
  price_entry: MASTER_DATA_ADMIN_SCOPE,
  production_record: PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  quema: PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  loss: PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  consumption: PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  finished_goods_receipt: WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  order_allocation: OPERATIONS_COORDINATOR_RECORD_SCOPE,
  purchase_request: PURCHASING_OPERATIONAL_RECORD_SCOPE,
  operational_case: OPERATIONS_COORDINATOR_RECORD_SCOPE,
  customer_communication: COMMERCIAL_TEAM_READ_SCOPE,
  warehouse_exit: DELIVERY_RECORD_SCOPE,
  delivery: DELIVERY_RECORD_SCOPE,
  delivery_note: DELIVERY_RECORD_SCOPE,
  coordination_decision: OPERATIONS_COORDINATOR_RECORD_SCOPE,
  work_item: COMMERCIAL_TEAM_READ_SCOPE,
  attention: COMMERCIAL_TEAM_READ_SCOPE,
  global_search: COMMERCIAL_TEAM_READ_SCOPE,
  management_command_center: MANAGEMENT_ORG_READ_SCOPE,
} as const satisfies Record<TenantSurface, string>;

export type TenantSurfaceRow = {
  id: string;
  organizationId: string;
  label: string;
};

export type ReadTenantSurfaceInput<T extends TenantSurfaceRow = TenantSurfaceRow> = {
  surface: TenantSurface;
  sessionOrganizationId: string | null | undefined;
  resourceOrganizationId: string | null | undefined;
  grantedScopes: readonly string[];
  requiredScope: string;
  rows: readonly T[];
  query?: string | null;
};

export type TenantReadAllowed<T extends TenantSurfaceRow> = {
  ok: true;
  surface: TenantSurface;
  code: null;
  rows: T[];
  count: number;
  suggestions: T[];
  autocomplete: T[];
  recent: T[];
  quickView: T[];
};

export type TenantReadDenied = {
  ok: false;
  surface: TenantSurface;
  code: TenantDenialCode;
  rows: [];
  count: 0;
  suggestions: [];
  autocomplete: [];
  recent: [];
  quickView: [];
};

export type TenantReadResult<T extends TenantSurfaceRow = TenantSurfaceRow> =
  | TenantReadAllowed<T>
  | TenantReadDenied;

function isKnownSurface(value: string): value is TenantSurface {
  return (TENANT_SURFACES as readonly string[]).includes(value);
}

/** Same rule as scopeImplies: a held scope satisfies only that exact scope. */
function heldScopeMatches(heldScope: string, requiredScope: string): boolean {
  const held = heldScope.trim();
  const required = requiredScope.trim();
  return held.length > 0 && held === required;
}

function organizationId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function deny(surface: TenantSurface, code: TenantDenialCode): TenantReadDenied {
  return {
    ok: false,
    surface,
    code,
    rows: [],
    count: 0,
    suggestions: [],
    autocomplete: [],
    recent: [],
    quickView: [],
  };
}

function labelMatchesQuery(label: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;
  const hay = label.trim().toLowerCase();
  return hay.startsWith(needle) || hay.includes(needle);
}

/**
 * Single read gate for every named surface.
 * Hidden UI is not authorization: missing scope, a cross-tenant request, and a
 * missing session each return a denial and zero rows.
 */
export function readTenantSurface<T extends TenantSurfaceRow>(
  input: ReadTenantSurfaceInput<T>,
): TenantReadResult<T> {
  const surface = isKnownSurface(input.surface) ? input.surface : null;
  if (!surface) return deny('customer', 'ROLE_FORBIDDEN');

  const session = organizationId(input.sessionOrganizationId);
  if (!session) return deny(surface, 'AUTH_REQUIRED');

  const resource = organizationId(input.resourceOrganizationId);
  if (!resource) return deny(surface, 'TENANT_FORBIDDEN');
  try {
    assertTenantMatch(session, resource);
  } catch (error) {
    if (error instanceof Error && error.message === 'TENANT_FORBIDDEN') {
      return deny(surface, 'TENANT_FORBIDDEN');
    }
    throw error;
  }

  const required = TENANT_SURFACE_REQUIRED_SCOPE[surface];
  const requested = input.requiredScope.trim();
  const granted = input.grantedScopes.some((scope) => heldScopeMatches(scope, required));
  if (!requested || requested !== required || !granted) {
    return deny(surface, 'ROLE_FORBIDDEN');
  }

  const sameTenant = input.rows.filter((row) => {
    if (!row || typeof row.organizationId !== 'string') return false;
    return row.organizationId.trim() === session;
  });
  const query = input.query?.trim() ?? '';
  const matched = query ? sameTenant.filter((row) => labelMatchesQuery(row.label, query)) : [];
  const listed = query ? matched : sameTenant;

  return {
    ok: true,
    surface,
    code: null,
    rows: sameTenant,
    count: sameTenant.length,
    suggestions: matched,
    autocomplete: matched,
    recent: listed,
    quickView: listed,
  };
}
