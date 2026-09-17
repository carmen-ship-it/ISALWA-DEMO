/**
 * CT3-E owner-demo guards + catalog unit tests (no DB).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  OWNER_DEMO_CLIENTS,
  OWNER_DEMO_CONVERSATIONS,
  OWNER_DEMO_STORY_STEPS,
  ownerDemoCatalogMeta,
} from './catalog';
import {
  OWNER_DEMO_REAL_ORG,
  OWNER_DEMO_REAL_SEVEN,
  OWNER_DEMO_SYNTH_ORG,
  assertNotProtectedRealSevenName,
  assertOwnerDemoConfirm,
  assertOwnerDemoNotRealOrg,
  assertOwnerDemoSynthOrg,
  hasOwnerDemoNotesTag,
  isOwnerDemoDisplayName,
  isProtectedRealSevenName,
  realSevenMutationProof,
  withOwnerDemoNotesTag,
} from './guards';

describe('owner-demo guards', () => {
  it('accepts only SYNTH org', () => {
    assert.doesNotThrow(() => assertOwnerDemoSynthOrg(OWNER_DEMO_SYNTH_ORG));
    assert.throws(() => assertOwnerDemoSynthOrg(OWNER_DEMO_REAL_ORG), /NON_SYNTH/);
    assert.throws(() => assertOwnerDemoNotRealOrg(OWNER_DEMO_REAL_ORG), /REAL_TENANT/);
  });

  it('refuses REAL seven names', () => {
    for (const name of OWNER_DEMO_REAL_SEVEN) {
      assert.equal(isProtectedRealSevenName(name), true);
      assert.throws(() => assertNotProtectedRealSevenName(name), /REAL_SEVEN/);
    }
    assert.equal(isProtectedRealSevenName('DEMO MADERAS ORIENTE'), false);
  });

  it('requires explicit confirm', () => {
    assert.throws(() => assertOwnerDemoConfirm(undefined), /STAGING_FIXTURE_CONFIRM/);
    assert.doesNotThrow(() => assertOwnerDemoConfirm('1'));
  });

  it('tags demo display names and notes', () => {
    assert.equal(isOwnerDemoDisplayName('DEMO MADERAS ORIENTE'), true);
    assert.equal(isOwnerDemoDisplayName('COMERCIAL ALVAREZ'), false);
    assert.equal(hasOwnerDemoNotesTag(withOwnerDemoNotesTag('loop')), true);
  });

  it('publishes REAL_SEVEN_MUTATED=NO proof shape', () => {
    const proof = realSevenMutationProof();
    assert.equal(proof.realOrgTouched, false);
    assert.equal(proof.realSevenNamesTouched, false);
    assert.equal(proof.targetOrganizationId, OWNER_DEMO_SYNTH_ORG);
  });
});

describe('owner-demo catalog', () => {
  it('defines five DEMO clients and 20 story steps', () => {
    const meta = ownerDemoCatalogMeta();
    assert.equal(meta.clientCount, 5);
    assert.equal(meta.storyStepCount, 20);
    assert.equal(OWNER_DEMO_STORY_STEPS.length, 20);
    assert.equal(OWNER_DEMO_CLIENTS.length, 5);
    for (const client of OWNER_DEMO_CLIENTS) {
      assert.match(client.displayName, /^DEMO /);
      assert.equal(isProtectedRealSevenName(client.displayName), false);
    }
    assert.equal(OWNER_DEMO_CONVERSATIONS.length, 5);
  });

  it('numbers story steps 1..20 without gaps', () => {
    assert.deepEqual(
      OWNER_DEMO_STORY_STEPS.map((s) => s.step),
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
  });
});
