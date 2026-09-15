import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { V1_PLANNED_ASSIGNMENTS } from '@isalwa/os-contracts';
import {
  ALLOWED_SYNTHETIC_EMAILS,
  EXPECTED_MIGRATION_COUNT,
  HOSTED_APP_SHA,
  ROLE_EMAILS,
  STAGING_DATABASE_HOST_MARKER,
  STAGING_DATABASE_NAME,
  STAGING_SUPABASE_PROJECT_REF,
  assertCapabilitiesMatchPlanned,
  assertMigrationCount,
  assertNotRealTenant,
  assertPreConnectGuards,
  assertRequiredFixtureEnv,
  assertRoleEmailMapBounded,
  assertStagingDatabaseName,
  assertStagingDatabaseUrl,
  assertStagingFixtureConfirm,
  assertSupabaseStagingProject,
  assertSyntheticEmailAllowed,
  plannedCapabilitiesFor,
} from './staging-wave2-role-fixtures-guards';

const validEnv = {
  OS_DATABASE_URL: `postgresql://u:p@${STAGING_DATABASE_HOST_MARKER}.virginia-postgres.render.com:5432/${STAGING_DATABASE_NAME}`,
  SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
  SUPABASE_ANON_KEY: 'anon-test',
  SUPABASE_SERVICE_ROLE_KEY: 'service-test',
  STAGING_FIXTURE_CONFIRM: '1',
};

describe('staging-wave2-role-fixtures guards', () => {
  it('A: missing STAGING_FIXTURE_CONFIRM => fail', () => {
    assert.throws(
      () => assertStagingFixtureConfirm({ ...validEnv, STAGING_FIXTURE_CONFIRM: undefined }),
      /STAGING_FIXTURE_CONFIRM_REQUIRED/,
    );
    assert.throws(
      () => assertStagingFixtureConfirm({ ...validEnv, STAGING_FIXTURE_CONFIRM: 'yes' }),
      /STAGING_FIXTURE_CONFIRM_REQUIRED/,
    );
  });

  it('A2: confirm fails before secrets (clean-room load path)', () => {
    assert.throws(() => assertPreConnectGuards({}), /STAGING_FIXTURE_CONFIRM_REQUIRED/);
    assert.throws(
      () => assertPreConnectGuards({ STAGING_FIXTURE_CONFIRM: undefined }),
      /STAGING_FIXTURE_CONFIRM_REQUIRED/,
    );
  });

  it('A3: package exports point at gitignored dist (clean-room needs prepare)', () => {
    // Documents root cause of MODULE_NOT_FOUND for @isalwa/ts-utils in fresh worktrees.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../ts-utils/package.json') as { main?: string; exports?: { '.': { default?: string } } };
    assert.equal(pkg.main, './dist/index.js');
    assert.equal(pkg.exports?.['.']?.default, './dist/index.js');
  });

  it('A4: fixture prepare script must not nest bare pnpm', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const root = JSON.parse(
      readFileSync(join(__dirname, '../../../package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    const prepare = root.scripts['fixture:wave2-roles:prepare'] ?? '';
    const full = root.scripts['fixture:wave2-roles'] ?? '';
    assert.ok(prepare.length > 0, 'prepare script missing');
    assert.equal(/^pnpm(\s|$)/.test(prepare), false, 'prepare must not start with bare pnpm');
    assert.match(prepare, /\bcorepack\s+pnpm\b/, 'prepare must use corepack pnpm');
    assert.equal(/^pnpm(\s|$)/.test(full), false, 'full fixture script must not start with bare pnpm');
    assert.match(full, /\bcorepack\s+pnpm\b/, 'full fixture script must use corepack pnpm');
    for (const chunk of `${prepare} && ${full}`.split('&&').map((s) => s.trim())) {
      if (/^pnpm(\s|$)/.test(chunk)) {
        assert.fail(`bare pnpm fragment: ${chunk}`);
      }
    }
  });

  it('B: wrong DB name => fail before writes', () => {
    assert.throws(() => assertStagingDatabaseName('isalwa_os_production'), /UNEXPECTED_DATABASE_NAME/);
    assert.throws(() => assertStagingDatabaseName('postgres'), /UNEXPECTED_DATABASE_NAME/);
    assert.doesNotThrow(() => assertStagingDatabaseName(STAGING_DATABASE_NAME));
  });

  it('B2: wrong DB host => fail', () => {
    assert.throws(
      () =>
        assertStagingDatabaseUrl(
          'postgresql://u:p@dpg-other-prod.virginia-postgres.render.com:5432/isalwa_os_staging',
        ),
      /UNEXPECTED_DATABASE_HOST/,
    );
    assert.doesNotThrow(() => assertStagingDatabaseUrl(validEnv.OS_DATABASE_URL));
  });

  it('C: wrong Supabase ref => fail before writes', () => {
    assert.throws(
      () => assertSupabaseStagingProject('https://wrongproject.supabase.co'),
      /UNEXPECTED_SUPABASE_PROJECT_REF/,
    );
    assert.equal(
      assertSupabaseStagingProject(validEnv.SUPABASE_URL),
      STAGING_SUPABASE_PROJECT_REF,
    );
  });

  it('D: missing required env => fail (after confirm)', () => {
    assert.throws(() => assertRequiredFixtureEnv({}), /MISSING_ENV:OS_DATABASE_URL/);
    assert.throws(
      () =>
        assertRequiredFixtureEnv({
          OS_DATABASE_URL: validEnv.OS_DATABASE_URL,
          SUPABASE_URL: validEnv.SUPABASE_URL,
          SUPABASE_ANON_KEY: validEnv.SUPABASE_ANON_KEY,
        }),
      /MISSING_ENV:SUPABASE_SERVICE_ROLE_KEY/,
    );
    assert.throws(
      () => assertPreConnectGuards({ STAGING_FIXTURE_CONFIRM: '1' }),
      /MISSING_ENV:OS_DATABASE_URL/,
    );
  });

  it('E: valid staging guards => execution may proceed (pre-connect)', () => {
    const out = assertPreConnectGuards(validEnv);
    assert.equal(out.projectRef, STAGING_SUPABASE_PROJECT_REF);
    assert.equal(out.supabaseUrl, validEnv.SUPABASE_URL);
  });

  it('F: real tenant collision => fail', () => {
    const real = new Set(['01REALTENANT']);
    assert.throws(() => assertNotRealTenant('01REALTENANT', real), /REFUSING_TO_MUTATE_REAL_STAGING_TENANT/);
    assert.doesNotThrow(() => assertNotRealTenant('01SYNTH', real));
  });

  it('G: unexpected email/domain => fail', () => {
    assert.throws(() => assertSyntheticEmailAllowed('isa@isalwa.com.bo'), /UNEXPECTED_SYNTHETIC_EMAIL/);
    assert.throws(() => assertSyntheticEmailAllowed('w2.asesor@other.demo'), /UNEXPECTED_SYNTHETIC_EMAIL/);
    assert.throws(() => assertSyntheticEmailAllowed('carmen.staging@isalwa.demo'), /UNEXPECTED_SYNTHETIC_EMAIL/);
    for (const email of ALLOWED_SYNTHETIC_EMAILS) {
      assert.doesNotThrow(() => assertSyntheticEmailAllowed(email));
    }
  });

  it('H: exact 9-role assignment set', () => {
    assert.equal(V1_PLANNED_ASSIGNMENTS.length, 9);
    assert.equal(ALLOWED_SYNTHETIC_EMAILS.length, 9);
    assert.doesNotThrow(() => assertRoleEmailMapBounded());
    assert.equal(HOSTED_APP_SHA, 'ef7eeabdea5f8f4449ba706caa1a323435d96fcc');
    assert.equal(EXPECTED_MIGRATION_COUNT, 29);

    for (const planned of V1_PLANNED_ASSIGNMENTS) {
      assertCapabilitiesMatchPlanned(planned.functionId, planned.intendedCapabilities);
      assert.deepEqual(
        [...plannedCapabilitiesFor(planned.functionId)],
        [...planned.intendedCapabilities],
      );
      assert.ok(ROLE_EMAILS[planned.functionId].email.startsWith('w2.'));
    }

    assert.deepEqual([...plannedCapabilitiesFor('asesor-comercial')].sort(), [
      'commercial.customer.create',
      'commercial.quote.convert.own',
    ]);
    assert.deepEqual([...plannedCapabilitiesFor('encargado-almacen')].sort(), [
      'warehouse.finished_goods.allocate',
      'warehouse.finished_goods.receive',
      'warehouse.outbound.record',
    ]);
    assert.throws(
      () => assertCapabilitiesMatchPlanned('asesor-comercial', ['commercial.customer.create']),
      /CAPABILITY_MISMATCH/,
    );
  });

  it('I: migration count guard + confirm latch for idempotent entry', () => {
    assert.throws(() => assertMigrationCount(28), /UNEXPECTED_MIGRATION_COUNT:28/);
    assert.doesNotThrow(() => assertMigrationCount(29));
    assert.doesNotThrow(() => assertStagingFixtureConfirm(validEnv));
    // Pre-connect is pure and re-runnable (idempotent guard path)
    assertPreConnectGuards(validEnv);
    assertPreConnectGuards(validEnv);
  });

  it('auxiliar email is w2.coordinacion@isalwa.demo', () => {
    assert.equal(ROLE_EMAILS['auxiliar-coordinacion'].email, 'w2.coordinacion@isalwa.demo');
  });
});
