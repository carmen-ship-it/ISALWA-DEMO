/**
 * V1 people / function map for tenant ISALWA.
 *
 * This is a planned assignment receipt. It is not an AuthIdentity, not a
 * Member, and not a login. Person and login identity stay PENDING until a
 * real identity is supplied. No email, auth subject, or WhatsApp number is
 * invented here.
 *
 * The function label is not authority. Intended capabilities are existing
 * explicit scopes. Cargo and title never grant them. Holding one intended
 * scope does not grant another. Read is not write. Receive is not allocate.
 * commercial.exception.authorize is an explicit slot only; it is not
 * auto-granted by Jefe Comercial or Gerente General.
 * people.admin is not a shortcut into commercial or production data.
 * The Owner / Super Admin technical layer is not the Gerente business view.
 */

import { COORDINATION_DECISION_CAPABILITY } from './coordination-decision';
import { WAREHOUSE_EXIT_RECORD_SCOPE } from './delivery';
import {
  COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  COMMERCIAL_PRICE_APPROVE_SCOPE,
  COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
  DELIVERY_RECORD_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  INTEGRATION_ADMIN_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
  PEOPLE_ADMIN_SCOPE,
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
  SYSTEM_ADMIN_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  scopeImplies,
  scopesGrantedByCargoOrTitle,
} from './operations-scopes';
import {
  COMMERCIAL_ACCOUNT_REASSIGN_SCOPE,
  COMMERCIAL_ORDER_CONVERT_SCOPE,
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
} from './scopes';
import { WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE } from './warehouse-task';

export const V1_TENANT_LABEL = 'ISALWA' as const;
export const PLANNED_PERSON = 'PENDING' as const;
export const LOGIN_IDENTITY_PENDING = 'PENDING' as const;
export const CROSS_LANE_CHANGE_REQUEST = 'CROSS_LANE_CHANGE_REQUEST' as const;

export type PlannedLoginIdentity = typeof LOGIN_IDENTITY_PENDING;

export type V1PlannedFunctionId =
  | 'asesor-comercial'
  | 'jefe-comercial'
  | 'gerente-general'
  | 'encargado-produccion'
  | 'encargado-almacen'
  | 'encargada-compras'
  | 'contabilidad'
  | 'auxiliar-coordinacion'
  | 'isalwa-manager';

export type AssignmentLayer = 'business' | 'technical';

export type ExplicitCapabilitySlot = {
  capability: string;
  eligibleFunctionIds: readonly V1PlannedFunctionId[];
  autoGranted: false;
  grantedByTitle: false;
  note: string;
};

export type V1PlannedAssignment = {
  tenant: typeof V1_TENANT_LABEL;
  person: typeof PLANNED_PERSON;
  functionId: V1PlannedFunctionId;
  functionLabel: string;
  intendedProfileId: string;
  layer: AssignmentLayer;
  intendedCapabilities: readonly string[];
  explicitSlotsNotAutoGranted: readonly ExplicitCapabilitySlot[];
  loginIdentity: PlannedLoginIdentity;
  authoritySource: 'explicit-capability';
  cargoGrantsAuthority: false;
};

export type SuppliedLoginIdentity = {
  authIdentityId: string;
  email: string;
};

export type BoundPlannedAssignment = Omit<V1PlannedAssignment, 'person' | 'loginIdentity'> & {
  person: typeof PLANNED_PERSON;
  loginIdentity: SuppliedLoginIdentity;
  bound: true;
  createdAuthIdentity: false;
};

export type V1CrossLaneChangeRequest = {
  kind: typeof CROSS_LANE_CHANGE_REQUEST;
  functionId: V1PlannedFunctionId;
  functionLabel: string;
  domain: 'production' | 'warehouse' | 'purchasing' | 'coordination';
  need: 'read';
  readDoesNotEqualWrite: true;
  existingWriteCapabilities: readonly string[];
  requestedCapabilityString: null;
  reason: string;
};

export type UnassignedCapabilityNote = {
  capability: string;
  assignedToFunctionId: null;
  reason: string;
};

/**
 * Constants already exported from scopes, operations-scopes,
 * coordination-decision, warehouse-task, and delivery. A capability string
 * that is not in this set is not used.
 */
export const V1_KNOWN_EXPORTED_CAPABILITIES = [
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
  COMMERCIAL_ORDER_CONVERT_SCOPE,
  COMMERCIAL_ACCOUNT_REASSIGN_SCOPE,
  COMMERCIAL_PRICE_APPROVE_SCOPE,
  COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  PEOPLE_ADMIN_SCOPE,
  SYSTEM_ADMIN_SCOPE,
  INTEGRATION_ADMIN_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
  WAREHOUSE_EXIT_RECORD_SCOPE,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
  COORDINATION_DECISION_CAPABILITY,
  DELIVERY_RECORD_SCOPE,
] as const;

const NOT_IMPLIED = [
  COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
  PEOPLE_ADMIN_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
  DELIVERY_RECORD_SCOPE,
  WAREHOUSE_EXIT_RECORD_SCOPE,
  COMMERCIAL_ORDER_CONVERT_SCOPE,
  COMMERCIAL_PRICE_APPROVE_SCOPE,
  INTEGRATION_ADMIN_SCOPE,
] as const;

const PAYMENT_EXCEPTION_SLOT: ExplicitCapabilitySlot = {
  capability: COMMERCIAL_EXCEPTION_AUTHORIZE_SCOPE,
  eligibleFunctionIds: ['jefe-comercial', 'gerente-general'],
  autoGranted: false,
  grantedByTitle: false,
  note:
    'Explicit assignment only. The Jefe Comercial and Gerente General titles do not grant this scope, and it is not part of either function default.',
};

/** Slot that may be assigned later. Not granted by title or by the function default. */
export const V1_EXPLICIT_CAPABILITY_SLOTS: readonly ExplicitCapabilitySlot[] = [
  PAYMENT_EXCEPTION_SLOT,
];

function slotsFor(functionId: V1PlannedFunctionId): readonly ExplicitCapabilitySlot[] {
  return V1_EXPLICIT_CAPABILITY_SLOTS.filter((slot) =>
    slot.eligibleFunctionIds.includes(functionId),
  );
}

function row(
  functionId: V1PlannedFunctionId,
  functionLabel: string,
  intendedProfileId: string,
  layer: AssignmentLayer,
  intendedCapabilities: readonly string[],
): V1PlannedAssignment {
  return {
    tenant: V1_TENANT_LABEL,
    person: PLANNED_PERSON,
    functionId,
    functionLabel,
    intendedProfileId,
    layer,
    intendedCapabilities,
    explicitSlotsNotAutoGranted: slotsFor(functionId),
    loginIdentity: LOGIN_IDENTITY_PENDING,
    authoritySource: 'explicit-capability',
    cargoGrantsAuthority: false,
  };
}

/**
 * Intended profiles reuse the existing operating-home ids.
 * Capabilities are existing explicit scopes. This receipt does not grant them.
 * Owner technical controls stay off the Gerente business view.
 */
export const V1_PLANNED_ASSIGNMENTS: readonly V1PlannedAssignment[] = [
  row(
    'asesor-comercial',
    'Asesor Comercial',
    'asesor',
    'business',
    [COMMERCIAL_CUSTOMER_CREATE_SCOPE, COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE],
  ),
  row('jefe-comercial', 'Jefe Comercial', 'jefe', 'business', [COMMERCIAL_TEAM_READ_SCOPE]),
  row('gerente-general', 'Gerente General', 'gerente', 'business', [MANAGEMENT_ORG_READ_SCOPE]),
  row('encargado-produccion', 'Encargado de Producción', 'produccion', 'business', [
    PRODUCTION_OPERATIONAL_RECORD_SCOPE,
    PRODUCTION_ENTRY_MEMBER_SCOPE,
  ]),
  row('encargado-almacen', 'Encargado de Almacén', 'almacen', 'business', [
    WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
    WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
    WAREHOUSE_EXIT_RECORD_SCOPE,
  ]),
  row('encargada-compras', 'Encargada de Compras', 'compras', 'business', [
    PURCHASING_OPERATIONAL_RECORD_SCOPE,
  ]),
  row('contabilidad', 'Contabilidad', 'contabilidad', 'business', [FINANCE_OPERATIONAL_RECORD_SCOPE]),
  row('auxiliar-coordinacion', 'Auxiliar Administrativa / Coordinación', 'auxiliar', 'business', [
    OPERATIONS_COORDINATOR_RECORD_SCOPE,
    COORDINATION_DECISION_CAPABILITY,
    DELIVERY_RECORD_SCOPE,
  ]),
  // Business view and technical panel are both explicit. system.admin does not imply the read.
  row('isalwa-manager', 'ISALWA Manager / Owner / Super Admin', 'system-controls', 'technical', [
    MANAGEMENT_ORG_READ_SCOPE,
    SYSTEM_ADMIN_SCOPE,
  ]),
] as const;

/**
 * Existing scopes with no confirmed person or function mapping.
 * Not granted to a nearby function to fill a gap.
 */
export const V1_UNASSIGNED_CAPABILITIES = [
  COMMERCIAL_PRICE_APPROVE_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
  PEOPLE_ADMIN_SCOPE,
  COMMERCIAL_ORDER_CONVERT_SCOPE,
  COMMERCIAL_ACCOUNT_REASSIGN_SCOPE,
  COMMERCIAL_ORG_READ_SCOPE,
  INTEGRATION_ADMIN_SCOPE,
] as const;

export const V1_UNASSIGNED_NOTES: readonly UnassignedCapabilityNote[] = [
  {
    capability: COMMERCIAL_PRICE_APPROVE_SCOPE,
    assignedToFunctionId: null,
    reason: 'No confirmed person or function. Jefe Comercial title does not grant it.',
  },
  {
    capability: PRODUCTION_REVIEW_MEMBER_SCOPE,
    assignedToFunctionId: null,
    reason:
      'No confirmed person. Not implied by production entry or by coordinator record.',
  },
  {
    capability: PEOPLE_ADMIN_SCOPE,
    assignedToFunctionId: null,
    reason:
      'No confirmed person. Not a Gerente or Owner shortcut to commercial or production data.',
  },
  {
    capability: COMMERCIAL_ORDER_CONVERT_SCOPE,
    assignedToFunctionId: null,
    reason:
      'No confirmed person. Not implied by commercial.quote.convert.own on Asesor Comercial.',
  },
  {
    capability: COMMERCIAL_ACCOUNT_REASSIGN_SCOPE,
    assignedToFunctionId: null,
    reason: 'No confirmed person or function. Title does not grant it.',
  },
  {
    capability: COMMERCIAL_ORG_READ_SCOPE,
    assignedToFunctionId: null,
    reason:
      'Gerente business view uses management.org.read. This scope is not implied by that scope or by the title.',
  },
  {
    capability: INTEGRATION_ADMIN_SCOPE,
    assignedToFunctionId: null,
    reason:
      'No confirmed person. Super Admin title and system.admin do not grant it. System controls do not include integration health.',
  },
];

const READ_GAP =
  'A read is required and is not the same as the existing write. No read scope is exported from scopes.ts, operations-scopes.ts, coordination-decision.ts, warehouse-task.ts, or delivery.ts. Do not invent a capability string.';

export const V1_CROSS_LANE_CHANGE_REQUESTS: readonly V1CrossLaneChangeRequest[] = [
  {
    kind: CROSS_LANE_CHANGE_REQUEST,
    functionId: 'encargado-produccion',
    functionLabel: 'Encargado de Producción',
    domain: 'production',
    need: 'read',
    readDoesNotEqualWrite: true,
    existingWriteCapabilities: [
      PRODUCTION_OPERATIONAL_RECORD_SCOPE,
      PRODUCTION_ENTRY_MEMBER_SCOPE,
    ],
    requestedCapabilityString: null,
    reason: READ_GAP,
  },
  {
    kind: CROSS_LANE_CHANGE_REQUEST,
    functionId: 'encargado-almacen',
    functionLabel: 'Encargado de Almacén',
    domain: 'warehouse',
    need: 'read',
    readDoesNotEqualWrite: true,
    existingWriteCapabilities: [
      WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
      WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
      WAREHOUSE_EXIT_RECORD_SCOPE,
    ],
    requestedCapabilityString: null,
    reason: READ_GAP,
  },
  {
    kind: CROSS_LANE_CHANGE_REQUEST,
    functionId: 'encargada-compras',
    functionLabel: 'Encargada de Compras',
    domain: 'purchasing',
    need: 'read',
    readDoesNotEqualWrite: true,
    existingWriteCapabilities: [PURCHASING_OPERATIONAL_RECORD_SCOPE],
    requestedCapabilityString: null,
    reason: READ_GAP,
  },
  {
    kind: CROSS_LANE_CHANGE_REQUEST,
    functionId: 'auxiliar-coordinacion',
    functionLabel: 'Auxiliar Administrativa / Coordinación',
    domain: 'coordination',
    need: 'read',
    readDoesNotEqualWrite: true,
    existingWriteCapabilities: [
      OPERATIONS_COORDINATOR_RECORD_SCOPE,
      COORDINATION_DECISION_CAPABILITY,
      DELIVERY_RECORD_SCOPE,
    ],
    requestedCapabilityString: null,
    reason: READ_GAP,
  },
];

export const V1_IDENTITY_STATUS = {
  tenant: V1_TENANT_LABEL,
  person: PLANNED_PERSON,
  loginIdentity: LOGIN_IDENTITY_PENDING,
  emailsInvented: 0,
  authIdentitiesCreated: 0,
  whatsAppNumbersInvented: 0,
} as const;

function listedCapabilityIsKnown(scope: string): boolean {
  return (V1_KNOWN_EXPORTED_CAPABILITIES as readonly string[]).includes(scope);
}

function assertKnownCapabilities(): void {
  const listed = [
    ...V1_PLANNED_ASSIGNMENTS.flatMap((item) => item.intendedCapabilities),
    ...V1_EXPLICIT_CAPABILITY_SLOTS.map((slot) => slot.capability),
    ...V1_UNASSIGNED_CAPABILITIES,
    ...V1_CROSS_LANE_CHANGE_REQUESTS.flatMap((request) => request.existingWriteCapabilities),
  ];
  for (const scope of listed) {
    if (!listedCapabilityIsKnown(scope)) {
      throw new Error(`${CROSS_LANE_CHANGE_REQUEST}: refusing an unexported capability string`);
    }
  }
}

assertKnownCapabilities();

export function plannedAssignmentByFunction(
  functionId: V1PlannedFunctionId,
): V1PlannedAssignment | null {
  return V1_PLANNED_ASSIGNMENTS.find((item) => item.functionId === functionId) ?? null;
}

export function capabilityAssignedToFunction(scope: string): V1PlannedFunctionId | null {
  const match = V1_PLANNED_ASSIGNMENTS.find((item) => item.intendedCapabilities.includes(scope));
  return match?.functionId ?? null;
}

/** A function label, cargo, or title never yields scopes. */
export function capabilitiesGrantedByFunctionLabel(
  _functionLabel: string | null | undefined,
  cargo?: string | null,
  title?: string | null,
): readonly [] {
  void scopesGrantedByCargoOrTitle(cargo ?? _functionLabel, title ?? _functionLabel);
  return [];
}

export function intendedCapabilityIsGrantedNow(
  _assignment: V1PlannedAssignment,
  _scope: string,
): false {
  return false;
}

/** A held scope satisfies only that same scope. Receive does not imply allocate. */
export function scopeImpliedBySibling(heldScope: string, requiredScope: string): boolean {
  return scopeImplies(heldScope, requiredScope);
}

export function receiveImpliesAllocate(): boolean {
  return scopeImpliedBySibling(
    WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
    WAREHOUSE_FINISHED_GOODS_ALLOCATE_SCOPE,
  );
}

export function writeScopeSatisfiesRead(
  _writeScope: string,
  _domain: V1CrossLaneChangeRequest['domain'],
): false {
  return false;
}

export function peopleAdminBundledIntoGerente(): boolean {
  const gerente = plannedAssignmentByFunction('gerente-general');
  if (!gerente) return false;
  const listed = [
    ...gerente.intendedCapabilities,
    ...gerente.explicitSlotsNotAutoGranted.map((slot) => slot.capability),
  ];
  return listed.includes(PEOPLE_ADMIN_SCOPE);
}

/**
 * True only when delivery.record appears outside the explicit Coordinación
 * intended capability: another function, or an auto-grant slot. The owner
 * assignment on Auxiliar Administrativa / Coordinación is not silent.
 */
export function deliveryRecordSilentlyAssigned(): boolean {
  for (const item of V1_PLANNED_ASSIGNMENTS) {
    const onSlot = item.explicitSlotsNotAutoGranted.some(
      (slot) => slot.capability === DELIVERY_RECORD_SCOPE,
    );
    if (onSlot) return true;
    if (
      item.functionId !== 'auxiliar-coordinacion' &&
      item.intendedCapabilities.includes(DELIVERY_RECORD_SCOPE)
    ) {
      return true;
    }
  }
  return false;
}

const IDENTITY_KEYS = new Set([
  'email',
  'authidentityid',
  'authsubject',
  'auth_subject',
  'sub',
  'whatsapp',
  'whatsappnumber',
  'phone',
]);

function identityMaterialPresent(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.includes('@') || /whatsapp/i.test(value) || /\+\d{6,}/.test(value);
  }
  if (Array.isArray(value)) return value.some(identityMaterialPresent);
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (IDENTITY_KEYS.has(key.toLowerCase())) return true;
      if (identityMaterialPresent(nested)) return true;
    }
  }
  return false;
}

export function plannedMapContainsInventedIdentity(value: unknown = v1FunctionMapReceipt()): boolean {
  return identityMaterialPresent(value);
}

/**
 * Bind a real identity that the caller already has. Does not create an
 * AuthIdentity and does not invent an email. Empty input stays unbound.
 * The planned map does not call this.
 */
export function bindSuppliedLoginIdentity(
  assignment: V1PlannedAssignment,
  supplied: SuppliedLoginIdentity | null | undefined,
): BoundPlannedAssignment | null {
  const authIdentityId = supplied?.authIdentityId?.trim() ?? '';
  const email = supplied?.email?.trim() ?? '';
  if (!authIdentityId || !email) return null;
  return {
    ...assignment,
    person: PLANNED_PERSON,
    loginIdentity: { authIdentityId, email },
    bound: true,
    createdAuthIdentity: false,
  };
}

export type V1FunctionMapReceipt = {
  tenant: typeof V1_TENANT_LABEL;
  loginIdentitiesInvented: 0;
  authIdentitiesCreated: 0;
  emailsInvented: 0;
  whatsAppNumbersInvented: 0;
  personStatus: typeof PLANNED_PERSON;
  loginIdentityStatus: PlannedLoginIdentity;
  assignments: readonly V1PlannedAssignment[];
  notImpliedByFunction: readonly string[];
  unassignedCapabilities: readonly string[];
  unassignedNotes: readonly UnassignedCapabilityNote[];
  explicitSlotsNotAutoGranted: readonly ExplicitCapabilitySlot[];
  crossLaneChangeRequests: readonly V1CrossLaneChangeRequest[];
};

export function v1FunctionMapReceipt(): V1FunctionMapReceipt {
  return {
    tenant: V1_TENANT_LABEL,
    loginIdentitiesInvented: 0,
    authIdentitiesCreated: 0,
    emailsInvented: 0,
    whatsAppNumbersInvented: 0,
    personStatus: PLANNED_PERSON,
    loginIdentityStatus: LOGIN_IDENTITY_PENDING,
    assignments: V1_PLANNED_ASSIGNMENTS,
    notImpliedByFunction: NOT_IMPLIED,
    unassignedCapabilities: V1_UNASSIGNED_CAPABILITIES,
    unassignedNotes: V1_UNASSIGNED_NOTES,
    explicitSlotsNotAutoGranted: V1_EXPLICIT_CAPABILITY_SLOTS,
    crossLaneChangeRequests: V1_CROSS_LANE_CHANGE_REQUESTS,
  };
}
