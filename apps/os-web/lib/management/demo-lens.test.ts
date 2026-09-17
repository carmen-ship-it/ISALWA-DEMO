import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterByPartyDemoMode,
  keepPartyIdForDemoMode,
  shouldShowManagementTeamTable,
} from './demo-lens';

describe('management demo lens', () => {
  const isDemoParty = (partyId: string) => partyId.startsWith('demo-');

  it('keeps DEMO and real party ids in separate modes', () => {
    assert.equal(keepPartyIdForDemoMode('demo-1', 'demo', isDemoParty), true);
    assert.equal(keepPartyIdForDemoMode('real-1', 'demo', isDemoParty), false);
    assert.equal(keepPartyIdForDemoMode('demo-1', 'real', isDemoParty), false);
    assert.equal(keepPartyIdForDemoMode('real-1', 'real', isDemoParty), true);
  });

  it('filters commercial rows for funnel counts without mixing modes', () => {
    const rows = [{ partyId: 'demo-a' }, { partyId: 'real-b' }, { partyId: 'demo-c' }];
    assert.deepEqual(
      filterByPartyDemoMode(rows, 'demo', isDemoParty).map((row) => row.partyId),
      ['demo-a', 'demo-c'],
    );
    assert.deepEqual(
      filterByPartyDemoMode(rows, 'real', isDemoParty).map((row) => row.partyId),
      ['real-b'],
    );
  });

  it('hides salesperson team table in demo Gerencia lens', () => {
    assert.equal(shouldShowManagementTeamTable('demo'), false);
    assert.equal(shouldShowManagementTeamTable('real'), true);
  });
});
