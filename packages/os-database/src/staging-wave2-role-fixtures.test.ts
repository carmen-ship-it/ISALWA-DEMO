import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { COMMAND_REQUIRED_SCOPES, V1_PLANNED_ASSIGNMENTS } from '@isalwa/os-contracts';
import { memberHasScope, type MemberAccessSnapshot } from '@isalwa/os-domain';
import {
  ALLOWED_FIXTURE_TOOL_EMAILS,
  ALLOWED_SYNTHETIC_EMAILS,
  EXPECTED_MIGRATION_COUNT,
  HOSTED_APP_SHA,
  ROLE_EMAILS,
  STAGING_DATABASE_HOST_MARKER,
  STAGING_DATABASE_NAME,
  STAGING_SUPABASE_PROJECT_REF,
  WAVE2_FIXTURE_SEED_EMAIL,
  WAVE2_FIXTURE_SEED_SCOPES,
  assertCapabilitiesMatchPlanned,
  assertFixtureToolEmailAllowed,
  assertIsFixtureSeedEmail,
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
import {
  assertAsesorDeniedCreateParty,
  assertAsesorOwnsSynthCommercialProof,
  assertBusinessRoleLacksFixtureSeedScopes,
  assertCommercialSeedActorEmail,
  expectedWave2FixtureCounts,
  fixtureSeedActorSpec,
  plannedActiveGrantCount,
  planSynthCommercialOwnership,
  reconcileActiveGrants,
} from './staging-wave2-role-fixtures-lib';

const validEnv = {
  OS_DATABASE_URL: `postgresql://u:p@${STAGING_DATABASE_HOST_MARKER}.virginia-postgres.render.com:5432/${STAGING_DATABASE_NAME}`,
  SUPABASE_URL: `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
  SUPABASE_ANON_KEY: 'anon-test',
  SUPABASE_SERVICE_ROLE_KEY: 'service-test',
  STAGING_FIXTURE_CONFIRM: '1',
};

function snap(scopes: string[]): MemberAccessSnapshot {
  return {
    memberId: 'm1',
    organizationId: '01M2JKF77TXMJNDTKNCYNHH9G5',
    accessStatus: 'active',
    roleKeys: scopes,
    delegatedScopes: [],
  };
}

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../ts-utils/package.json') as {
      main?: string;
      exports?: { '.': { default?: string } };
    };
    assert.equal(pkg.main, './dist/index.js');
    assert.equal(pkg.exports?.['.']?.default, './dist/index.js');
  });

  it('A4: fixture prepare script must not nest bare pnpm', () => {
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
    assert.doesNotThrow(() => assertNotRealTenant('01M2JKF77TXMJNDTKNCYNHH9G5', real));
  });

  it('G: unexpected email/domain => fail; seed email not a business persona', () => {
    assert.throws(() => assertSyntheticEmailAllowed('isa@isalwa.com.bo'), /UNEXPECTED_SYNTHETIC_EMAIL/);
    assert.throws(() => assertSyntheticEmailAllowed('w2.asesor@other.demo'), /UNEXPECTED_SYNTHETIC_EMAIL/);
    assert.throws(() => assertSyntheticEmailAllowed('carmen.staging@isalwa.demo'), /UNEXPECTED_SYNTHETIC_EMAIL/);
    assert.throws(
      () => assertSyntheticEmailAllowed(WAVE2_FIXTURE_SEED_EMAIL),
      /UNEXPECTED_SYNTHETIC_EMAIL/,
    );
    for (const email of ALLOWED_SYNTHETIC_EMAILS) {
      assert.doesNotThrow(() => assertSyntheticEmailAllowed(email));
    }
    assert.doesNotThrow(() => assertFixtureToolEmailAllowed(WAVE2_FIXTURE_SEED_EMAIL));
    assert.doesNotThrow(() => assertIsFixtureSeedEmail(WAVE2_FIXTURE_SEED_EMAIL));
    assert.throws(() => assertIsFixtureSeedEmail('w2.asesor@isalwa.demo'), /EXPECTED_FIXTURE_SEED_EMAIL/);
    assert.equal(ALLOWED_FIXTURE_TOOL_EMAILS.length, 21);
  });

  it('H: exact 9-role assignment set; seed actor not in V1 map', () => {
    assert.equal(V1_PLANNED_ASSIGNMENTS.length, 9);
    assert.equal(ALLOWED_SYNTHETIC_EMAILS.length, 9);
    assert.doesNotThrow(() => assertRoleEmailMapBounded());
    assert.equal(HOSTED_APP_SHA, 'ef7eeabdea5f8f4449ba706caa1a323435d96fcc');
    assert.equal(EXPECTED_MIGRATION_COUNT, 30);

    for (const planned of V1_PLANNED_ASSIGNMENTS) {
      assertCapabilitiesMatchPlanned(planned.functionId, planned.intendedCapabilities);
      assert.deepEqual(
        [...plannedCapabilitiesFor(planned.functionId)],
        [...planned.intendedCapabilities],
      );
      assert.ok(ROLE_EMAILS[planned.functionId].email.startsWith('w2.'));
      assertBusinessRoleLacksFixtureSeedScopes(
        planned.functionId,
        planned.intendedCapabilities,
      );
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
    assert.throws(() => assertMigrationCount(29), /UNEXPECTED_MIGRATION_COUNT:29/);
    assert.doesNotThrow(() => assertMigrationCount(30));
    assert.doesNotThrow(() => assertStagingFixtureConfirm(validEnv));
    assertPreConnectGuards(validEnv);
    assertPreConnectGuards(validEnv);
  });

  it('auxiliar email is w2.coordinacion@isalwa.demo', () => {
    assert.equal(ROLE_EMAILS['auxiliar-coordinacion'].email, 'w2.coordinacion@isalwa.demo');
  });
});

describe('staging-wave2-role-fixtures seed actor + recovery', () => {
  it('seed actor is fixture-only with CreateParty + account reassign scopes', () => {
    const spec = fixtureSeedActorSpec();
    assert.equal(spec.email, WAVE2_FIXTURE_SEED_EMAIL);
    assert.equal(spec.isBusinessRole, false);
    assert.equal(spec.purpose, 'fixture-setup-only');
    assert.deepEqual([...spec.scopes], ['master_data.admin', 'commercial.account.reassign']);
    assert.deepEqual([...WAVE2_FIXTURE_SEED_SCOPES], [
      'master_data.admin',
      'commercial.account.reassign',
    ]);
    assert.equal(spec.scopes.includes('system.admin'), false);
    assert.equal(spec.scopes.includes('people.admin'), false);
    assert.equal(spec.scopes.includes('management.org.read'), false);
  });

  it('expected fixture counts match intended commercial-only setup', () => {
    const counts = expectedWave2FixtureCounts();
    assert.equal(counts.businessRoles, 9);
    assert.equal(counts.plannedActiveGrants, 15);
    assert.equal(plannedActiveGrantCount(), 15);
    assert.equal(counts.seedActors, 1);
    assert.equal(counts.seedScopes, 2);
    assert.equal(counts.parties, 1);
    assert.equal(counts.opportunities, 1);
    assert.equal(counts.quotes, 1);
    assert.equal(counts.quoteLines, 1);
    assert.equal(counts.orders, 0);
    assert.equal(counts.productionRecords, 0);
    assert.equal(counts.warehouseRecords, 0);
    assert.equal(counts.purchasingRecords, 0);
    assert.equal(counts.financeFacts, 0);
    assert.equal(counts.coordinationRecords, 0);
    assert.equal(counts.workItems, 0);
    assert.equal(counts.approvals, 0);
  });

  it('partial-state recovery: grant reconcile reuses active keys and grants only missing', () => {
    const partialBusiness = reconcileActiveGrants(
      ['commercial.customer.create', 'commercial.quote.convert.own'],
      ['commercial.customer.create', 'commercial.quote.convert.own'],
    );
    assert.deepEqual(partialBusiness.toGrant, []);
    assert.deepEqual(partialBusiness.toEnd, []);
    assert.deepEqual(partialBusiness.alreadyActive, [
      'commercial.customer.create',
      'commercial.quote.convert.own',
    ]);

    const missingSeed = reconcileActiveGrants([], [...WAVE2_FIXTURE_SEED_SCOPES]);
    assert.deepEqual(missingSeed.toGrant, [
      'commercial.account.reassign',
      'master_data.admin',
    ]);
    assert.deepEqual(missingSeed.toEnd, []);
    assert.deepEqual(missingSeed.alreadyActive, []);
  });

  it('idempotent second run: reconcile is a no-op when complete', () => {
    const seedDone = reconcileActiveGrants(
      [...WAVE2_FIXTURE_SEED_SCOPES],
      [...WAVE2_FIXTURE_SEED_SCOPES],
    );
    assert.deepEqual(seedDone.toGrant, []);
    assert.deepEqual(seedDone.toEnd, []);
    assert.deepEqual(seedDone.alreadyActive, [
      'commercial.account.reassign',
      'master_data.admin',
    ]);

    for (const planned of V1_PLANNED_ASSIGNMENTS) {
      const again = reconcileActiveGrants(
        planned.intendedCapabilities,
        planned.intendedCapabilities,
      );
      assert.deepEqual(again.toGrant, []);
      assert.deepEqual(again.toEnd, []);
    }
    assert.equal(plannedActiveGrantCount(), 15);
  });

  it('idempotent grant reconcile ends drift without duplicating', () => {
    const drifted = reconcileActiveGrants(
      ['commercial.customer.create', 'master_data.admin', 'people.admin'],
      ['commercial.customer.create', 'commercial.quote.convert.own'],
    );
    assert.deepEqual(drifted.toEnd, ['master_data.admin', 'people.admin']);
    assert.deepEqual(drifted.toGrant, ['commercial.quote.convert.own']);
  });

  it('CreateParty seed must use fixture seed actor email, never Asesor', () => {
    assert.doesNotThrow(() => assertCommercialSeedActorEmail(WAVE2_FIXTURE_SEED_EMAIL));
    assert.throws(
      () => assertCommercialSeedActorEmail('w2.asesor@isalwa.demo'),
      /COMMERCIAL_SEED_MUST_USE_FIXTURE_ACTOR/,
    );
    assert.throws(
      () => assertCommercialSeedActorEmail('w2.owner@isalwa.demo'),
      /COMMERCIAL_SEED_MUST_USE_FIXTURE_ACTOR/,
    );
  });

  it('ownership reconcile prefers keep-id moves over recreate', () => {
    const asesor = 'asesor-member';
    const seed = 'seed-member';
    assert.deepEqual(
      planSynthCommercialOwnership({
        targetOwnerMemberId: asesor,
        accountOwnerMemberId: seed,
        opportunityOwnerMemberId: seed,
        quoteOwnerMemberId: seed,
      }),
      { reassignAccount: true, assignOpportunity: true, patchQuoteOwner: true },
    );
    assert.deepEqual(
      planSynthCommercialOwnership({
        targetOwnerMemberId: asesor,
        accountOwnerMemberId: asesor,
        opportunityOwnerMemberId: asesor,
        quoteOwnerMemberId: asesor,
      }),
      { reassignAccount: false, assignOpportunity: false, patchQuoteOwner: false },
    );
  });

  it('fixture source: CreateParty via seed; Opp/Quote owned by Asesor', () => {
    const src = readFileSync(join(__dirname, 'staging-wave2-role-fixtures.ts'), 'utf8');
    assert.match(src, /WAVE2_FIXTURE_SEED_EMAIL|fixtureSeedActorSpec/);
    assert.match(src, /via=fixture-seed-actor/);
    assert.match(src, /seedActor\.memberId/);
    assert.match(src, /asesorSession/);
    assert.match(src, /CreateOpportunity',\s*asesorSession/);
    assert.match(src, /CreateQuote',\s*asesorSession/);
    assert.match(src, /ReassignCommercialAccountOwner/);
    assert.match(src, /AssignOpportunityOwner/);
    assert.match(src, /QUOTE_OWNER_PATCHED/);
    assert.match(src, /commercialOwnedByFunctionId: 'asesor-comercial'/);
    assert.match(src, /commercialSeededBy: 'fixture-seed-actor'/);
    assert.match(src, /PLANNED_FORWARD_UNWIRED/);
    assert.match(src, /SYNTH_ACCOUNT_OWNER_NOT_ASESOR/);
  });

  it('Asesor owns synth proof: view own, deny unrelated, convert own submitted, create=NO', () => {
    const asesorCaps = [...plannedCapabilitiesFor('asesor-comercial')];
    const proof = assertAsesorOwnsSynthCommercialProof({
      organizationId: '01M2JKF77TXMJNDTKNCYNHH9G5',
      asesorMemberId: 'e6f13fdc-fb46-4382-b0d3-599a6d4a0676',
      unrelatedMemberId: 'c202b296-574b-492c-b46e-2f8387b23805',
      ownerMemberId: 'e6f13fdc-fb46-4382-b0d3-599a6d4a0676',
      quoteStatus: 'submitted',
      asesorScopes: asesorCaps,
    });
    assert.equal(proof.asesorCanView, true);
    assert.equal(proof.unrelatedCanView, false);
    assert.equal(proof.asesorCanConvertOwnSubmitted, true);
    assert.equal(proof.convertOwnScopeAloneDoesNotAuthorizeForeign, true);
    assert.equal(proof.createPartyStillDenied, true);

    const seedOwned = assertAsesorOwnsSynthCommercialProof({
      organizationId: '01M2JKF77TXMJNDTKNCYNHH9G5',
      asesorMemberId: 'e6f13fdc-fb46-4382-b0d3-599a6d4a0676',
      unrelatedMemberId: 'c202b296-574b-492c-b46e-2f8387b23805',
      ownerMemberId: 'f9b83fae-cdf5-427b-bff8-a27c1aa3052a',
      quoteStatus: 'submitted',
      asesorScopes: asesorCaps,
    });
    assert.equal(seedOwned.asesorCanView, false);
    assert.equal(seedOwned.asesorCanConvertOwnSubmitted, false);
  });
});

describe('staging-wave2-role-fixtures authorization truth', () => {
  it('CreateParty requires master_data.admin; Asesor scopes do not satisfy', () => {
    assert.equal(COMMAND_REQUIRED_SCOPES.CreateParty, 'master_data.admin');
    const asesorCaps = [...plannedCapabilitiesFor('asesor-comercial')];
    assertAsesorDeniedCreateParty(asesorCaps);
    assert.equal(memberHasScope(snap(asesorCaps), 'master_data.admin'), false);
    assert.equal(memberHasScope(snap(['master_data.admin']), 'master_data.admin'), true);
  });

  it('people.admin does not imply CreateParty', () => {
    assert.equal(memberHasScope(snap(['people.admin']), 'master_data.admin'), false);
    assert.throws(
      () =>
        assertBusinessRoleLacksFixtureSeedScopes('people-admin-probe', [
          'people.admin',
          'master_data.admin',
        ]),
      /BUSINESS_ROLE_MUST_NOT_HOLD_SEED_SCOPE/,
    );
  });

  it('cargo/title grants nothing toward CreateParty', () => {
    assert.equal(memberHasScope(snap(['asesor', 'Asesor Comercial']), 'master_data.admin'), false);
    assert.equal(memberHasScope(snap([]), 'master_data.admin'), false);
  });

  it('fixture seed actor can CreateParty; Asesor commercial commands stay member_active', () => {
    assert.equal(memberHasScope(snap([...WAVE2_FIXTURE_SEED_SCOPES]), 'master_data.admin'), true);
    assert.equal(
      memberHasScope(snap([...WAVE2_FIXTURE_SEED_SCOPES]), 'commercial.account.reassign'),
      true,
    );
    assert.equal(COMMAND_REQUIRED_SCOPES.CreateOpportunity, 'member_active');
    assert.equal(COMMAND_REQUIRED_SCOPES.CreateQuote, 'member_active');
    assert.equal(COMMAND_REQUIRED_SCOPES.AddQuoteLine, 'member_active');
    assert.equal(COMMAND_REQUIRED_SCOPES.SubmitQuote, 'member_active');
    assert.equal(COMMAND_REQUIRED_SCOPES.AssignOpportunityOwner, 'member_active');
    assert.equal(COMMAND_REQUIRED_SCOPES.ReassignCommercialAccountOwner, 'member_active');
    assert.equal(COMMAND_REQUIRED_SCOPES.CreateOrder, 'member_active');
  });

  it('tenant isolation: real tenant id refused; synth org id allowed against real set', () => {
    const realSevenOrg = '01M2DV9F0V5DXS4G89AKF4D5SR';
    const synthOrg = '01M2JKF77TXMJNDTKNCYNHH9G5';
    assert.throws(
      () => assertNotRealTenant(realSevenOrg, new Set([realSevenOrg])),
      /REFUSING_TO_MUTATE_REAL_STAGING_TENANT/,
    );
    assert.doesNotThrow(() => assertNotRealTenant(synthOrg, new Set([realSevenOrg])));
  });
});
