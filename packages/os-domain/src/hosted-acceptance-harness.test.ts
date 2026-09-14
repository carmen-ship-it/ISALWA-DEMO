import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FIXTURE_OTHER_ORG_ID,
  FIXTURE_SESSION_ORG_ID,
  OPERATING_JOURNEYS,
  PINNED_SHA,
  REQUIRED_NEGATIVE_CASE_IDS,
  UNSCOPED_FUNCTION_IDS,
  runHostedAcceptanceHarness,
  verdictForObservedCall,
  type AcceptanceHarnessResult,
} from './hosted-acceptance-harness';

const FORBIDDEN_FIXTURE_TOKENS = [
  'H-VIP-001',
  'H-DEBT-001',
  'H-SILENT-001',
  'H-TANK-001',
  'H-NEG-001',
  'Casa Ceramica',
  'Valle Andino',
  'Don Julio',
  'Tanques Norte',
];

async function harness(): Promise<AcceptanceHarnessResult> {
  return runHostedAcceptanceHarness();
}

describe('hosted acceptance harness', () => {
  it('does not certify live isolation or hosted acceptance', async () => {
    const result = await harness();
    assert.equal(result.pinnedSha, PINNED_SHA);
    assert.equal(result.pinnedSha, '316426f272bce29924ffd4991da88ffe7d421bbd');
    assert.equal(result.hostedAcceptanceStarted, false);
    assert.equal(result.browserVerified, false);
    assert.equal(result.safeForIsa, false);
    assert.equal(result.liveTenantIsolationPassed, false);
    assert.equal(result.proof.current, 'UNPROVEN');
    assert.equal(result.proof.hostedAcceptance, 'UNPROVEN');
    assert.equal(result.proof.browserVerified, false);
    assert.equal(result.proof.userAccepted, false);
    assert.equal(result.proof.safeForIsa, false);
    assert.equal(result.proof.liveTenantIsolation, 'UNPROVEN');
    assert.equal(result.inProcessGate.certifiesLiveIsolation, false);
    assert.equal(result.inProcessGate.hostedAcceptance, 'UNPROVEN');
  });

  it('names every required negative case and does not mark one PASS', async () => {
    const result = await harness();
    assert.deepEqual(
      result.cases.map((item) => item.id),
      [...REQUIRED_NEGATIVE_CASE_IDS],
    );
    assert.equal(result.summary.pass, 0);
    assert.equal(result.summary.fail, 0);
    assert.equal(result.summary.unproven, REQUIRED_NEGATIVE_CASE_IDS.length);
    for (const item of result.cases) {
      assert.equal(item.status, 'UNPROVEN');
      assert.equal(item.proofState, 'UNPROVEN');
      assert.notEqual(item.status, 'PASS');
      assert.notEqual(item.status, 'FAIL');
      if (item.otherTenantRowReturned === true) {
        assert.equal(item.status, 'UNPROVEN');
      }
    }
  });

  it('reports the five unscoped readers as UNPROVEN, including an observed other-tenant row', async () => {
    const result = await harness();
    assert.deepEqual(
      result.unscopedFunctions.map((item) => item.id),
      [...UNSCOPED_FUNCTION_IDS],
    );
    for (const item of result.unscopedFunctions) {
      assert.equal(item.status, 'UNPROVEN');
      assert.notEqual(item.status, 'PASS');
    }
    for (const item of result.unscopedFunctions) {
      assert.equal(item.called, true, item.id);
      assert.equal(item.otherTenantRowReturned, true, item.id);
      assert.equal(item.status, 'UNPROVEN', item.id);
    }
  });

  it('does not turn a returned other-tenant row into PASS', () => {
    assert.equal(verdictForObservedCall({ otherTenantRowReturned: true }), 'UNPROVEN');
    assert.equal(verdictForObservedCall({ otherTenantRowReturned: null }), 'UNPROVEN');
    assert.equal(verdictForObservedCall({ otherTenantRowReturned: false }), 'UNPROVEN');
    assert.notEqual(verdictForObservedCall({ otherTenantRowReturned: true }), 'PASS');
  });

  it('lists the operating journey as unproven checklist data', async () => {
    const result = await harness();
    assert.deepEqual(
      result.journeys.map((item) => item.id),
      OPERATING_JOURNEYS.map((item) => item.id),
    );
    assert.equal(result.journeys.length, 20);
    for (const [index, item] of result.journeys.entries()) {
      assert.equal(item.label, OPERATING_JOURNEYS[index]?.label);
      assert.equal(item.status, 'UNPROVEN');
      assert.equal(item.proofState, 'UNPROVEN');
      assert.equal(item.hostedReviewerRequired, true);
    }
  });

  it('uses synthetic fixture organizations and does not claim a hosted pass', async () => {
    const result = await harness();
    const serialized = JSON.stringify(result);
    assert.equal(result.fixtures.sessionOrganizationId, FIXTURE_SESSION_ORG_ID);
    assert.equal(result.fixtures.otherOrganizationId, FIXTURE_OTHER_ORG_ID);
    assert.equal(result.fixtures.synthetic, true);
    assert.equal(result.fixtures.usesRealCustomers, false);
    assert.equal(serialized.includes(FIXTURE_SESSION_ORG_ID), true);
    assert.equal(serialized.includes(FIXTURE_OTHER_ORG_ID), true);
    for (const token of FORBIDDEN_FIXTURE_TOKENS) {
      assert.equal(serialized.includes(token), false, token);
    }
    assert.equal(serialized.includes('"liveTenantIsolationPassed":true'), false);
    assert.equal(serialized.includes('"browserVerified":true'), false);
    assert.equal(serialized.includes('"safeForIsa":true'), false);
    assert.equal(serialized.includes('"hostedAcceptanceStarted":true'), false);
    assert.equal(result.note.includes('not a pass'), true);
  });
});
