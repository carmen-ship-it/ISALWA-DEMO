/**
 * Pure helpers for Wave 2 staging role fixtures (tooling only).
 * No network I/O. Safe to unit-test without a live database.
 */
import {
  canConvertQuoteToOrder,
  DELIVERY_RECORD_SCOPE,
  V1_PLANNED_ASSIGNMENTS,
} from '@isalwa/os-contracts';
import {
  WAVE2_FIXTURE_SEED_EMAIL,
  WAVE2_FIXTURE_SEED_FAMILY_NAME,
  WAVE2_FIXTURE_SEED_GIVEN_NAME,
  WAVE2_FIXTURE_SEED_SCOPES,
  type Wave2FixtureSeedEmail,
} from './staging-wave2-role-fixtures-guards';

export type GrantReconcilePlan = {
  toEnd: string[];
  toGrant: string[];
  alreadyActive: string[];
};

/** Idempotent grant reconcile: end extras, grant missing. Never duplicates. */
export function reconcileActiveGrants(
  currentActiveKeys: readonly string[],
  wantedKeys: readonly string[],
): GrantReconcilePlan {
  const wanted = new Set(wantedKeys);
  const current = new Set(currentActiveKeys);
  const toEnd = [...current].filter((k) => !wanted.has(k)).sort();
  const toGrant = [...wanted].filter((k) => !current.has(k)).sort();
  const alreadyActive = [...wanted].filter((k) => current.has(k)).sort();
  return { toEnd, toGrant, alreadyActive };
}

export function plannedActiveGrantCount(): number {
  return V1_PLANNED_ASSIGNMENTS.reduce((n, row) => n + row.intendedCapabilities.length, 0);
}

/**
 * Materialize the permanent Coordinación assignment of delivery.record.
 * Adds only that capability. Refuses any other grant or any revocation.
 */
export function planCoordinacionDeliveryRecordMaterialization(
  currentActiveKeys: readonly string[],
  plannedCoordinacionCapabilities: readonly string[],
): { toGrant: readonly string[]; alreadyActive: readonly string[] } {
  if (!plannedCoordinacionCapabilities.includes(DELIVERY_RECORD_SCOPE)) {
    throw new Error('DELIVERY_RECORD_NOT_IN_COORDINACION_PLAN');
  }
  const plan = reconcileActiveGrants(currentActiveKeys, plannedCoordinacionCapabilities);
  if (plan.toEnd.length > 0) {
    throw new Error(`UNEXPECTED_ROLE_DRIFT_TO_END:${plan.toEnd.join(',')}`);
  }
  const unexpected = plan.toGrant.filter((key) => key !== DELIVERY_RECORD_SCOPE);
  if (unexpected.length > 0) {
    throw new Error(`UNEXPECTED_ROLE_DRIFT_TO_GRANT:${unexpected.join(',')}`);
  }
  return { toGrant: plan.toGrant, alreadyActive: plan.alreadyActive };
}

/**
 * Exact synthetic business-data counts already intended by the fixture tool.
 * Does not invent ops/finance/warehouse rows — those remain role-home/login proofs
 * against empty or separately authorized paths.
 */
export function expectedWave2FixtureCounts() {
  return {
    businessRoles: 9 as const,
    plannedActiveGrants: plannedActiveGrantCount(),
    seedActors: 1 as const,
    seedScopes: WAVE2_FIXTURE_SEED_SCOPES.length,
    parties: 1 as const,
    opportunities: 1 as const,
    quotes: 1 as const,
    quoteLines: 1 as const,
    orders: 0 as const,
    productionRecords: 0 as const,
    warehouseRecords: 0 as const,
    purchasingRecords: 0 as const,
    financeFacts: 0 as const,
    coordinationRecords: 0 as const,
    workItems: 0 as const,
    approvals: 0 as const,
  };
}

export type FixtureSeedActorSpec = {
  email: Wave2FixtureSeedEmail;
  givenName: string;
  familyName: string;
  scopes: readonly string[];
  isBusinessRole: false;
  purpose: 'fixture-setup-only';
};

export function fixtureSeedActorSpec(): FixtureSeedActorSpec {
  return {
    email: WAVE2_FIXTURE_SEED_EMAIL,
    givenName: WAVE2_FIXTURE_SEED_GIVEN_NAME,
    familyName: WAVE2_FIXTURE_SEED_FAMILY_NAME,
    scopes: [...WAVE2_FIXTURE_SEED_SCOPES],
    isBusinessRole: false,
    purpose: 'fixture-setup-only',
  };
}

/** CreateParty setup session must use the fixture seed actor (not Asesor). */
export function assertCommercialSeedActorEmail(email: string): void {
  if (email.trim().toLowerCase() !== WAVE2_FIXTURE_SEED_EMAIL) {
    throw new Error(`COMMERCIAL_SEED_MUST_USE_FIXTURE_ACTOR:${email}`);
  }
}

/** Business personas must never receive fixture-seed scopes. */
export function assertBusinessRoleLacksFixtureSeedScopes(
  functionId: string,
  capabilities: readonly string[],
): void {
  for (const scope of WAVE2_FIXTURE_SEED_SCOPES) {
    if (capabilities.includes(scope)) {
      throw new Error(`BUSINESS_ROLE_MUST_NOT_HOLD_SEED_SCOPE:${functionId}:${scope}`);
    }
  }
}

export function assertAsesorDeniedCreateParty(capabilities: readonly string[]): void {
  assertBusinessRoleLacksFixtureSeedScopes('asesor-comercial', capabilities);
  if (capabilities.includes('master_data.admin')) {
    throw new Error('ASESOR_MUST_NOT_HOLD_MASTER_DATA_ADMIN');
  }
  if (capabilities.includes('commercial.account.reassign')) {
    throw new Error('ASESOR_MUST_NOT_HOLD_ACCOUNT_REASSIGN');
  }
  if (!capabilities.includes('commercial.customer.create')) {
    throw new Error('ASESOR_MISSING_PLANNED_CUSTOMER_CREATE_SCOPE');
  }
}

export type SynthCommercialOwnershipPlan = {
  reassignAccount: boolean;
  assignOpportunity: boolean;
  /** No AssignQuoteOwner command — fixture tooling patches write-model owner only. */
  patchQuoteOwner: boolean;
};

/**
 * Prefer reconcile over delete/recreate: only schedule ownership moves when the
 * current owner is not the target Asesor member.
 */
export function planSynthCommercialOwnership(input: {
  targetOwnerMemberId: string;
  accountOwnerMemberId: string | null | undefined;
  opportunityOwnerMemberId: string | null | undefined;
  quoteOwnerMemberId: string | null | undefined;
}): SynthCommercialOwnershipPlan {
  const target = input.targetOwnerMemberId.trim();
  if (!target) throw new Error('SYNTH_OWNERSHIP_TARGET_REQUIRED');
  return {
    reassignAccount:
      input.accountOwnerMemberId != null &&
      input.accountOwnerMemberId !== '' &&
      input.accountOwnerMemberId !== target,
    assignOpportunity:
      input.opportunityOwnerMemberId != null &&
      input.opportunityOwnerMemberId !== '' &&
      input.opportunityOwnerMemberId !== target,
    patchQuoteOwner:
      input.quoteOwnerMemberId != null &&
      input.quoteOwnerMemberId !== '' &&
      input.quoteOwnerMemberId !== target,
  };
}

/**
 * Acceptance predicates for Asesor-owned synth commercial rows.
 * Mirrors os-query ownership visibility + CreateOrder convert gate (unchanged policy).
 */
export function assertAsesorOwnsSynthCommercialProof(input: {
  organizationId: string;
  asesorMemberId: string;
  unrelatedMemberId: string;
  ownerMemberId: string;
  quoteStatus: string;
  asesorScopes: readonly string[];
}): {
  asesorCanView: boolean;
  unrelatedCanView: boolean;
  asesorCanConvertOwnSubmitted: boolean;
  convertOwnScopeAloneDoesNotAuthorizeForeign: boolean;
  createPartyStillDenied: boolean;
} {
  // Same rule as canViewCommercialRecord for non-people.admin members.
  const asesorCanView =
    input.ownerMemberId === input.asesorMemberId && input.organizationId.trim().length > 0;
  const unrelatedCanView = input.ownerMemberId === input.unrelatedMemberId;

  const asesorCanConvertOwnSubmitted =
    input.quoteStatus === 'submitted' &&
    canConvertQuoteToOrder({
      actorMemberId: input.asesorMemberId,
      grantedScopes: input.asesorScopes,
      quoteOwnerMemberId: input.ownerMemberId,
    });

  const convertOwnScopeAloneDoesNotAuthorizeForeign = !canConvertQuoteToOrder({
    actorMemberId: input.unrelatedMemberId,
    grantedScopes: ['commercial.quote.convert.own'],
    quoteOwnerMemberId: input.ownerMemberId,
  });

  return {
    asesorCanView,
    unrelatedCanView,
    asesorCanConvertOwnSubmitted,
    convertOwnScopeAloneDoesNotAuthorizeForeign,
    createPartyStillDenied: !input.asesorScopes.includes('master_data.admin'),
  };
}
