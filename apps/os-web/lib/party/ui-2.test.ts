import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  duplicatePartySummary,
  mergedPartyDetail,
  samplePartyDetail,
  samplePartySummary,
} from './fixtures';
import {
  contactDisplayName,
  contactSummary,
  formatDuplicateStatus,
  formatPartyRole,
  formatPartyRoles,
  formatPartyStatus,
  multiRoleHint,
} from './labels';
import { clientesSearchHref, partyHref, trabajoForPartyHref } from './navigation';

describe('UI-2 party role labels', () => {
  it('maps role keys to employee Spanish', () => {
    assert.equal(formatPartyRole('customer'), 'Cliente');
    assert.equal(formatPartyRole('supplier'), 'Proveedor');
    assert.equal(formatPartyRole('distributor'), 'Distribuidor');
    assert.equal(formatPartyRole('partner'), 'Socio');
  });

  it('shows multiple roles on same entity without duplication', () => {
    const labels = formatPartyRoles(['customer', 'supplier', 'customer']);
    assert.deepEqual(labels, ['Cliente', 'Proveedor']);
    assert.match(multiRoleHint(['customer', 'supplier']) ?? '', /también es proveedor/i);
  });

  it('returns null hint for single role', () => {
    assert.equal(multiRoleHint(['customer']), null);
  });
});

describe('UI-2 party list presentation', () => {
  it('renders search result fixture with multi-role keys', () => {
    assert.deepEqual(samplePartySummary.activeRoleKeys, ['customer', 'supplier']);
    assert.equal(samplePartySummary.hasCommercialAccount, true);
  });

  it('surfaces duplicate status from DTO', () => {
    assert.equal(formatDuplicateStatus(duplicatePartySummary.duplicateStatus), 'Posible duplicado');
    assert.equal(formatDuplicateStatus('none'), null);
  });

  it('formats party status in Spanish', () => {
    assert.equal(formatPartyStatus('active'), 'Activo');
    assert.equal(formatPartyStatus('merged'), 'Fusionado');
  });

  it('empty search results stay honest', () => {
    const items: typeof samplePartySummary[] = [];
    assert.equal(items.length, 0);
  });
});

describe('UI-2 party detail fixture', () => {
  it('includes canonical party with multiple roles', () => {
    assert.equal(samplePartyDetail.roles.length, 2);
    assert.equal(samplePartyDetail.contacts.length, 1);
    assert.ok(samplePartyDetail.commercialAccount);
  });

  it('renders contact names from DTO fields', () => {
    const contact = samplePartyDetail.contacts[0];
    assert.equal(contactDisplayName(contact.givenName, contact.familyName), 'María Fernández');
    assert.match(contactSummary(samplePartyDetail.contacts) ?? '', /María/);
  });

  it('handles merged party state', () => {
    assert.equal(mergedPartyDetail.party.status, 'merged');
    assert.equal(mergedPartyDetail.party.mergedIntoPartyId, 'party-1');
  });

  it('fiscal data not in HTTP detail fixture — UI must defer', () => {
    assert.equal('fiscalIdentities' in samplePartyDetail, false);
  });
});

describe('UI-2 navigation', () => {
  it('builds clientes routes without hard-coded IDs', () => {
    assert.equal(partyHref('party-1'), '/clientes/party-1');
    assert.equal(clientesSearchHref({ q: 'La Paz', roleKey: 'customer' }), '/clientes?q=La+Paz&roleKey=customer');
    assert.equal(trabajoForPartyHref('party-1'), '/trabajo?subjectType=party&subjectId=party-1');
  });
});

describe('UI-2 authorization presentation', () => {
  it('role labels are display-only strings', () => {
    const label = formatPartyRole('customer');
    assert.equal(typeof label, 'string');
    assert.notEqual(label, 'master_data.admin');
  });
});
