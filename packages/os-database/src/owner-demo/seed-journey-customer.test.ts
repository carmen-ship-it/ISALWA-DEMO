/**
 * Journey-customer fixture unit tests (no live DB).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  OWNER_DEMO_REAL_ORG,
  OWNER_DEMO_REAL_SEVEN,
  OWNER_DEMO_SYNTH_ORG,
  assertNotProtectedRealSevenName,
  assertOwnerDemoSynthOrg,
  isProtectedRealSevenName,
} from './guards';
import {
  FORBIDDEN_ENGINEERING_LABELS,
  JOURNEY_CUSTOMER,
  JOURNEY_CUSTOMER_INTENDED_INSERTS,
  JOURNEY_CUSTOMER_OWNER_EMAIL,
  PROTECTED_FIVE_DEMO_PARTY_IDS,
  assertJourneyCustomerIdentity,
  assertNoForbiddenEngineeringLabels,
  assertPipelineCountsZero,
  assertProtectedFiveUnchanged,
  assertRealSevenUnchanged,
  assertStagingSynthEnvironment,
  decideJourneyCustomerAction,
  demoModeVisibility,
  emptyPipelineCounts,
  findForbiddenEngineeringLabels,
  intendedInsertPlan,
  journeyCustomerUserVisibleStrings,
  matchingJourneyParty,
  resolveExactlyOneActiveOwner,
  rowIdentifiesProtectedRealName,
  type JourneyOwnerCandidate,
} from './journey-customer';

const OWNER: JourneyOwnerCandidate = {
  memberId: 'member-asesor-1',
  personId: 'person-asesor-1',
  authIdentityId: 'auth-asesor-1',
  email: JOURNEY_CUSTOMER_OWNER_EMAIL,
  accessStatus: 'active',
  organizationId: OWNER_DEMO_SYNTH_ORG,
};

function exactExisting() {
  return matchingJourneyParty({
    id: 'party-journey-1',
    organizationId: OWNER_DEMO_SYNTH_ORG,
    displayName: JOURNEY_CUSTOMER.displayName,
    legalName: JOURNEY_CUSTOMER.legalName,
    status: JOURNEY_CUSTOMER.status,
    ownerMemberId: OWNER.memberId,
    contact: JOURNEY_CUSTOMER.contact,
    location: JOURNEY_CUSTOMER.location,
    extraContacts: 0,
    extraLocations: 0,
    pipelineCounts: emptyPipelineCounts(),
  });
}

describe('journey-customer guards', () => {
  it('refuses any non-SYNTH organization', () => {
    assert.throws(() => assertOwnerDemoSynthOrg(OWNER_DEMO_REAL_ORG), /NON_SYNTH/);
    assert.throws(
      () =>
        assertStagingSynthEnvironment({
          databaseName: 'isalwa_os_staging',
          databaseUrl: 'postgres://user@dpg-dajd3kh5efls738falcg-a.example/isalwa_os_staging',
          organizationId: OWNER_DEMO_REAL_ORG,
        }),
      /NON_SYNTH|REAL_TENANT/,
    );
    assert.throws(
      () =>
        assertStagingSynthEnvironment({
          databaseName: 'isalwa_os_production',
          databaseUrl: 'postgres://user@dpg-dajd3kh5efls738falcg-a.example/isalwa_os_production',
          organizationId: OWNER_DEMO_SYNTH_ORG,
        }),
      /PRODUCTION_DATABASE|UNEXPECTED_DATABASE_NAME/,
    );
    assert.throws(
      () =>
        resolveExactlyOneActiveOwner(OWNER_DEMO_REAL_ORG, JOURNEY_CUSTOMER_OWNER_EMAIL, [
          { ...OWNER, organizationId: OWNER_DEMO_REAL_ORG },
        ]),
      /NON_SYNTH/,
    );
  });

  it('refuses protected REAL names', () => {
    for (const name of OWNER_DEMO_REAL_SEVEN) {
      assert.equal(isProtectedRealSevenName(name), true);
      assert.throws(() => assertNotProtectedRealSevenName(name), /REAL_SEVEN/);
      assert.equal(rowIdentifiesProtectedRealName(name, name), true);
    }
    assert.equal(isProtectedRealSevenName(JOURNEY_CUSTOMER.displayName), false);
    assert.doesNotThrow(() => assertNotProtectedRealSevenName(JOURNEY_CUSTOMER.displayName));
  });

  it('resolves exactly one owner for w2.asesor@isalwa.demo', () => {
    const one = resolveExactlyOneActiveOwner(OWNER_DEMO_SYNTH_ORG, JOURNEY_CUSTOMER_OWNER_EMAIL, [
      OWNER,
      { ...OWNER, memberId: 'inactive', accessStatus: 'suspended' },
      { ...OWNER, memberId: 'other', email: 'w2.almacen@isalwa.demo' },
    ]);
    assert.equal(one.memberId, 'member-asesor-1');
    assert.throws(
      () => resolveExactlyOneActiveOwner(OWNER_DEMO_SYNTH_ORG, JOURNEY_CUSTOMER_OWNER_EMAIL, []),
      /OWNER_NOT_FOUND/,
    );
    assert.throws(
      () =>
        resolveExactlyOneActiveOwner(OWNER_DEMO_SYNTH_ORG, JOURNEY_CUSTOMER_OWNER_EMAIL, [
          OWNER,
          { ...OWNER, memberId: 'member-asesor-2' },
        ]),
      /OWNER_AMBIGUOUS/,
    );
  });
});

describe('journey-customer insert plan', () => {
  it('creates exactly one party, one contact, and one location', () => {
    const plan = intendedInsertPlan();
    assert.equal(decideJourneyCustomerAction(null, OWNER.memberId), 'insert');
    assert.equal(plan.party.displayName, JOURNEY_CUSTOMER.displayName);
    assert.equal(plan.contact.givenName, 'Rosa');
    assert.equal(plan.contact.familyName, 'Mercado');
    assert.equal(plan.location.label, 'Obra San Lorenzo');
    assert.deepEqual(plan.inserts, [...JOURNEY_CUSTOMER_INTENDED_INSERTS]);
    assert.equal(plan.inserts.filter((name) => name === 'os_parties').length, 1);
    assert.equal(plan.inserts.filter((name) => name === 'os_contacts').length, 1);
    assert.equal(plan.inserts.filter((name) => name === 'os_locations').length, 1);
  });

  it('creates zero commercial or operational pipeline records', () => {
    const plan = intendedInsertPlan();
    assert.equal(plan.commercialOrOperationalRecords, 0);
    assertPipelineCountsZero(emptyPipelineCounts());
    const withOpp = emptyPipelineCounts();
    withOpp.opportunity = 1;
    assert.throws(() => assertPipelineCountsZero(withOpp), /UNEXPECTED_PIPELINE/);
  });

  it('a second run creates no duplicate', () => {
    assert.equal(decideJourneyCustomerAction(null, OWNER.memberId), 'insert');
    assert.equal(decideJourneyCustomerAction(exactExisting(), OWNER.memberId), 'reuse');
  });

  it('keeps existing five Demo party IDs unchanged', () => {
    const before = [...PROTECTED_FIVE_DEMO_PARTY_IDS];
    assertProtectedFiveUnchanged(before, before);
    assert.throws(() => assertProtectedFiveUnchanged(before, [...before, 'extra']), /CHANGED|MISSING/);
  });

  it('keeps protected REAL records unchanged', () => {
    const real = OWNER_DEMO_REAL_SEVEN.map((name, index) => ({ id: `real-${index}`, displayName: name }));
    assert.equal(isProtectedRealSevenName(JOURNEY_CUSTOMER.displayName), false);
    assertRealSevenUnchanged(real, real);
    assert.throws(
      () => assertRealSevenUnchanged(real, real.map((row) => ({ ...row, id: `${row.id}-x` }))),
      /CHANGED/,
    );
  });

  it('keeps notes empty and stores no forbidden engineering label', () => {
    assertJourneyCustomerIdentity();
    assert.equal(JOURNEY_CUSTOMER.notes, '');
    assert.deepEqual(findForbiddenEngineeringLabels(journeyCustomerUserVisibleStrings()), []);
    assert.doesNotThrow(() => assertNoForbiddenEngineeringLabels(journeyCustomerUserVisibleStrings()));
    for (const label of FORBIDDEN_ENGINEERING_LABELS) {
      assert.throws(() => assertNoForbiddenEngineeringLabels([label]), /FORBIDDEN_LABEL/);
    }
  });

  it('is visible in Demo mode and absent from Real mode', () => {
    const visibility = demoModeVisibility(JOURNEY_CUSTOMER.displayName);
    assert.equal(visibility.demo, true);
    assert.equal(visibility.real, false);
    assert.equal(demoModeVisibility('COMERCIAL ALVAREZ').demo, false);
    assert.equal(demoModeVisibility('COMERCIAL ALVAREZ').real, true);
  });

  it('refuses an existing party whose shape does not match the journey customer', () => {
    const extraContact = matchingJourneyParty({
      id: 'party-wrong',
      organizationId: OWNER_DEMO_SYNTH_ORG,
      displayName: JOURNEY_CUSTOMER.displayName,
      legalName: JOURNEY_CUSTOMER.legalName,
      status: 'active',
      ownerMemberId: OWNER.memberId,
      contact: JOURNEY_CUSTOMER.contact,
      location: JOURNEY_CUSTOMER.location,
      extraContacts: 1,
      extraLocations: 0,
      pipelineCounts: emptyPipelineCounts(),
    });
    assert.equal(decideJourneyCustomerAction(extraContact, OWNER.memberId), 'refuse');
  });
});
