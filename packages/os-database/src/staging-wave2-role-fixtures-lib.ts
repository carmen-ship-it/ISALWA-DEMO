/**
 * Pure helpers for Wave 2 staging role fixtures (tooling only).
 * No network I/O. Safe to unit-test without a live database.
 */
import { V1_PLANNED_ASSIGNMENTS } from '@isalwa/os-contracts';
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

/** Commercial CreateParty / opp / quote session must use the fixture seed actor. */
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
  if (!capabilities.includes('commercial.customer.create')) {
    throw new Error('ASESOR_MISSING_PLANNED_CUSTOMER_CREATE_SCOPE');
  }
}
