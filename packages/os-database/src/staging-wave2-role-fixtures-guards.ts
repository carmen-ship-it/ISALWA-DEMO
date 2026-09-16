/**
 * Fail-closed guards for Wave 2 staging role fixtures (tooling only).
 * No network I/O. Safe to unit-test without a live database.
 */
import { V1_PLANNED_ASSIGNMENTS, type V1PlannedFunctionId } from '@isalwa/os-contracts';

export const HOSTED_APP_SHA = 'ef7eeabdea5f8f4449ba706caa1a323435d96fcc' as const;
export const STAGING_SUPABASE_PROJECT_REF = 'qbpxuywtoycjpitxoblo' as const;
export const STAGING_DATABASE_NAME = 'isalwa_os_staging' as const;
/** Hostname substring for Render staging Postgres (no secret). */
export const STAGING_DATABASE_HOST_MARKER = 'dpg-dajd3kh5efls738falcg-a' as const;
export const EXPECTED_MIGRATION_COUNT = 29 as const;
export const STAGING_FIXTURE_CONFIRM_VALUE = '1' as const;

export const WAVE2_ROLE_FIXTURE_ORG_LEGAL_NAME =
  'ISALWA Wave2 Synthetic Roles (acceptance)' as const;
/** Deterministic slug for idempotent org create/reuse. */
export const WAVE2_ROLE_FIXTURE_ORG_SLUG = 'w2-roles-acceptance-v1' as const;
export const WAVE2_SYNTH_PARTY_LEGAL_NAME = 'SYNTH Wave2 Cliente S.R.L.' as const;

/**
 * Fixture-setup-only identity. Not a Wave 2 business persona under acceptance.
 * Holds only the scopes required to construct synthetic Party/commercial setup.
 */
export const WAVE2_FIXTURE_SEED_EMAIL = 'w2.fixture-seed@isalwa.demo' as const;
export const WAVE2_FIXTURE_SEED_GIVEN_NAME = 'Synth' as const;
export const WAVE2_FIXTURE_SEED_FAMILY_NAME = 'FixtureSeed' as const;
/**
 * Fixture-setup-only scopes (not a business persona under acceptance):
 * - master_data.admin → CreateParty
 * - commercial.account.reassign → move CommercialAccount ownership to Asesor
 * Opportunity/Quote writes use Asesor's existing member_active authority so
 * Asesor owns them permanently (no permanent FixtureSeed commercial owner).
 */
export const WAVE2_FIXTURE_SEED_SCOPES = [
  'master_data.admin',
  'commercial.account.reassign',
] as const;

export type Wave2FixtureSeedEmail = typeof WAVE2_FIXTURE_SEED_EMAIL;

export const ALLOWED_SYNTHETIC_EMAILS = [
  'w2.asesor@isalwa.demo',
  'w2.jefe@isalwa.demo',
  'w2.gerente@isalwa.demo',
  'w2.produccion@isalwa.demo',
  'w2.almacen@isalwa.demo',
  'w2.compras@isalwa.demo',
  'w2.contabilidad@isalwa.demo',
  'w2.coordinacion@isalwa.demo',
  'w2.owner@isalwa.demo',
] as const;

export type AllowedSyntheticEmail = (typeof ALLOWED_SYNTHETIC_EMAILS)[number];

/** Business roles (9) + fixture seed + Wave A continuity fixture emails. */
export const WAVE_A_CONTINUITY_FIXTURE_EMAILS = [
  'w2.people-admin@isalwa.demo',
  'w2.cont-a@isalwa.demo',
  'w2.cont-b@isalwa.demo',
  'w2.cont-commercial@isalwa.demo',
  'w2.cont-approver@isalwa.demo',
  'w2.cont-manager@isalwa.demo',
  'w2.cont-report@isalwa.demo',
  'w2.cont-coverage@isalwa.demo',
] as const;

export const ALLOWED_FIXTURE_TOOL_EMAILS = [
  ...ALLOWED_SYNTHETIC_EMAILS,
  WAVE2_FIXTURE_SEED_EMAIL,
  ...WAVE_A_CONTINUITY_FIXTURE_EMAILS,
] as const;

export const ROLE_EMAILS: Record<
  V1PlannedFunctionId,
  { email: AllowedSyntheticEmail; givenName: string; familyName: string }
> = {
  'asesor-comercial': {
    email: 'w2.asesor@isalwa.demo',
    givenName: 'Synth',
    familyName: 'Asesor',
  },
  'jefe-comercial': {
    email: 'w2.jefe@isalwa.demo',
    givenName: 'Synth',
    familyName: 'Jefe',
  },
  'gerente-general': {
    email: 'w2.gerente@isalwa.demo',
    givenName: 'Synth',
    familyName: 'Gerente',
  },
  'encargado-produccion': {
    email: 'w2.produccion@isalwa.demo',
    givenName: 'Synth',
    familyName: 'Produccion',
  },
  'encargado-almacen': {
    email: 'w2.almacen@isalwa.demo',
    givenName: 'Synth',
    familyName: 'Almacen',
  },
  'encargada-compras': {
    email: 'w2.compras@isalwa.demo',
    givenName: 'Synth',
    familyName: 'Compras',
  },
  contabilidad: {
    email: 'w2.contabilidad@isalwa.demo',
    givenName: 'Synth',
    familyName: 'Contabilidad',
  },
  'auxiliar-coordinacion': {
    email: 'w2.coordinacion@isalwa.demo',
    givenName: 'Synth',
    familyName: 'Coordinacion',
  },
  'isalwa-manager': {
    email: 'w2.owner@isalwa.demo',
    givenName: 'Synth',
    familyName: 'Owner',
  },
};

const REQUIRED_ENV = [
  'OS_DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

export function requireEnvFrom(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  name: string,
): string {
  const v = env[name]?.trim();
  if (!v) throw new Error(`MISSING_ENV:${name}`);
  return v;
}

export function assertRequiredFixtureEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): void {
  for (const name of REQUIRED_ENV) {
    requireEnvFrom(env, name);
  }
}

/** Operator latch only — not authority. */
export function assertStagingFixtureConfirm(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): void {
  const v = env.STAGING_FIXTURE_CONFIRM?.trim();
  if (v !== STAGING_FIXTURE_CONFIRM_VALUE) {
    throw new Error('STAGING_FIXTURE_CONFIRM_REQUIRED');
  }
}

export function assertSupabaseStagingProject(supabaseUrl: string): string {
  let hostname: string;
  try {
    hostname = new URL(supabaseUrl).hostname;
  } catch {
    throw new Error('INVALID_SUPABASE_URL');
  }
  const projectRef = hostname.split('.')[0] ?? '';
  if (projectRef !== STAGING_SUPABASE_PROJECT_REF) {
    throw new Error(`UNEXPECTED_SUPABASE_PROJECT_REF:${projectRef || 'empty'}`);
  }
  return projectRef;
}

/**
 * Fail closed unless URL host matches known staging Postgres service id.
 * Does not log the full connection string.
 */
export function assertStagingDatabaseUrl(databaseUrl: string): void {
  let hostname: string;
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    throw new Error('INVALID_OS_DATABASE_URL');
  }
  if (!hostname.includes(STAGING_DATABASE_HOST_MARKER)) {
    throw new Error('UNEXPECTED_DATABASE_HOST');
  }
}

export function assertStagingDatabaseName(currentDatabase: string): void {
  if (currentDatabase !== STAGING_DATABASE_NAME) {
    throw new Error(`UNEXPECTED_DATABASE_NAME:${currentDatabase}`);
  }
}

export function assertMigrationCount(count: number): void {
  if (count !== EXPECTED_MIGRATION_COUNT) {
    throw new Error(`UNEXPECTED_MIGRATION_COUNT:${count}`);
  }
}

export function assertNotRealTenant(
  organizationId: string,
  realTenantIds: ReadonlySet<string>,
): void {
  if (realTenantIds.has(organizationId)) {
    throw new Error('REFUSING_TO_MUTATE_REAL_STAGING_TENANT');
  }
}

function assertDemoEmailShape(email: string, normalized: string): void {
  if (!normalized.endsWith('@isalwa.demo')) {
    throw new Error(`UNEXPECTED_EMAIL_DOMAIN:${email}`);
  }
  if (normalized.includes('isalwa.com.bo')) {
    throw new Error(`REFUSING_REAL_DOMAIN_EMAIL:${email}`);
  }
}

/** Exactly the nine Wave 2 business personas (not the fixture seed actor). */
export function assertSyntheticEmailAllowed(email: string): void {
  const normalized = email.trim().toLowerCase();
  if (!(ALLOWED_SYNTHETIC_EMAILS as readonly string[]).includes(normalized)) {
    throw new Error(`UNEXPECTED_SYNTHETIC_EMAIL:${email}`);
  }
  assertDemoEmailShape(email, normalized);
}

/** Business persona OR dedicated fixture seed actor. */
export function assertFixtureToolEmailAllowed(email: string): void {
  const normalized = email.trim().toLowerCase();
  if (!(ALLOWED_FIXTURE_TOOL_EMAILS as readonly string[]).includes(normalized)) {
    throw new Error(`UNEXPECTED_FIXTURE_TOOL_EMAIL:${email}`);
  }
  assertDemoEmailShape(email, normalized);
}

export function assertIsFixtureSeedEmail(email: string): void {
  if (email.trim().toLowerCase() !== WAVE2_FIXTURE_SEED_EMAIL) {
    throw new Error(`EXPECTED_FIXTURE_SEED_EMAIL:${email}`);
  }
}

/** Every ROLE_EMAILS entry must be allowlisted and map 1:1 to planned functions. */
export function assertRoleEmailMapBounded(): void {
  const plannedIds = V1_PLANNED_ASSIGNMENTS.map((r) => r.functionId).sort();
  const mappedIds = (Object.keys(ROLE_EMAILS) as V1PlannedFunctionId[]).sort();
  if (plannedIds.length !== 9 || mappedIds.length !== 9) {
    throw new Error('EXPECTED_NINE_ROLE_PROFILES');
  }
  for (let i = 0; i < plannedIds.length; i++) {
    if (plannedIds[i] !== mappedIds[i]) {
      throw new Error('ROLE_EMAIL_MAP_MISMATCH');
    }
  }
  if (ALLOWED_SYNTHETIC_EMAILS.length !== 9) {
    throw new Error('EXPECTED_NINE_SYNTHETIC_EMAILS');
  }
  for (const planned of V1_PLANNED_ASSIGNMENTS) {
    const identity = ROLE_EMAILS[planned.functionId];
    assertSyntheticEmailAllowed(identity.email);
  }
  const emailSet = new Set(ALLOWED_SYNTHETIC_EMAILS);
  for (const planned of V1_PLANNED_ASSIGNMENTS) {
    emailSet.delete(ROLE_EMAILS[planned.functionId].email);
  }
  if (emailSet.size !== 0) {
    throw new Error('ORPHAN_ALLOWED_EMAIL');
  }
}

export function assertCapabilitiesMatchPlanned(
  functionId: V1PlannedFunctionId,
  granted: readonly string[],
): void {
  const planned = V1_PLANNED_ASSIGNMENTS.find((r) => r.functionId === functionId);
  if (!planned) throw new Error(`UNKNOWN_FUNCTION:${functionId}`);
  const expected = [...planned.intendedCapabilities].sort();
  const actual = [...granted].sort();
  if (expected.length !== actual.length || expected.some((c, i) => c !== actual[i])) {
    throw new Error(`CAPABILITY_MISMATCH:${functionId}`);
  }
}

export function plannedCapabilitiesFor(
  functionId: V1PlannedFunctionId,
): readonly string[] {
  const planned = V1_PLANNED_ASSIGNMENTS.find((r) => r.functionId === functionId);
  if (!planned) throw new Error(`UNKNOWN_FUNCTION:${functionId}`);
  return planned.intendedCapabilities;
}

/**
 * Guard sequence before any write.
 * Confirm latch runs first so a clean-room CLI load (no secrets) fails on
 * STAGING_FIXTURE_CONFIRM_REQUIRED after modules resolve.
 * DB name / migration count require a live connection and run next in main().
 */
export function assertPreConnectGuards(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): { supabaseUrl: string; databaseUrl: string; projectRef: string } {
  assertStagingFixtureConfirm(env);
  assertRequiredFixtureEnv(env);
  const supabaseUrl = requireEnvFrom(env, 'SUPABASE_URL');
  const databaseUrl = requireEnvFrom(env, 'OS_DATABASE_URL');
  const projectRef = assertSupabaseStagingProject(supabaseUrl);
  assertStagingDatabaseUrl(databaseUrl);
  assertRoleEmailMapBounded();
  return { supabaseUrl, databaseUrl, projectRef };
}
