import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  companyForDemoDataMode,
  organizationIdForCompany,
  parseOwnerEffectiveCompany,
} from './owner-company-context';

describe('owner-company-context', () => {
  it('maps demo mode to synth company and real to real', () => {
    assert.equal(companyForDemoDataMode('demo'), 'synth');
    assert.equal(companyForDemoDataMode('real'), 'real');
  });

  it('resolves known org ids without inventing others', () => {
    assert.equal(organizationIdForCompany('synth'), '01M2JKF77TXMJNDTKNCYNHH9G5');
    assert.equal(organizationIdForCompany('real'), '01M2DV9F0V5DXS4G89AKF4D5SR');
  });

  it('parses cookie values fail-closed', () => {
    assert.equal(parseOwnerEffectiveCompany('synth'), 'synth');
    assert.equal(parseOwnerEffectiveCompany('real'), 'real');
    assert.equal(parseOwnerEffectiveCompany('other'), null);
    assert.equal(parseOwnerEffectiveCompany(undefined), null);
  });
});
