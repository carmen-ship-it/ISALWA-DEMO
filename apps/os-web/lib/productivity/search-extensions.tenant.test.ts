import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CONTACT_MATCH_SCOPE,
  matchingContacts,
  matchingContactsRead,
  type SearchContactHit,
  type TrustedContactSession,
} from './search-extensions';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const OTHER_NAME = 'Zeta Other';
const OTHER_FOLDED = 'zeta other';
const OTHER_ACCENT = 'Zeta Óther';
const OTHER_EMAIL = 'zeta.other@example.invalid';
const OTHER_PHONE = '000-0000';
const OTHER_PHONE_QUERY = '0000000';
const SESSION_NAME = 'Alpha Session';
const OTHER_COUNT = 7;

function contact(overrides: Partial<SearchContactHit> & Pick<SearchContactHit, 'id' | 'givenName'>): SearchContactHit {
  return {
    familyName: '',
    email: null,
    phone: null,
    status: 'active',
    organizationId: SESSION,
    ...overrides,
  };
}

function otherContact(id: string, overrides: Partial<SearchContactHit> = {}): SearchContactHit {
  return contact({
    id,
    organizationId: OTHER,
    givenName: 'Zeta',
    familyName: 'Other',
    email: OTHER_EMAIL,
    phone: OTHER_PHONE,
    ...overrides,
  });
}

function session(scopes: readonly string[]): TrustedContactSession {
  return { organizationId: SESSION, grantedScopes: scopes };
}

function assertNoEvidence(serialized: string): void {
  assert.equal(serialized.includes(OTHER), false);
  assert.equal(serialized.includes(OTHER_NAME), false);
  assert.equal(serialized.includes(OTHER_FOLDED), false);
  assert.equal(serialized.includes('Zeta'), false);
  assert.equal(serialized.includes(OTHER_EMAIL), false);
  assert.equal(serialized.includes(OTHER_PHONE), false);
  assert.equal(serialized.includes(OTHER_PHONE_QUERY), false);
  assert.equal(serialized.includes('score'), false);
  assert.equal(serialized.includes('*'), false);
  assert.equal(serialized.includes('mask'), false);
  assert.equal(serialized.includes(`"count":${OTHER_COUNT}`), false);
}

describe('matchingContacts tenant scope', () => {
  it('matchingContacts same-tenant exact name is allowed', () => {
    const hits = matchingContacts(
      [contact({ id: 'c-alpha', givenName: 'Alpha', familyName: 'Session' }), otherContact('c-zeta')],
      SESSION_NAME,
      session([CONTACT_MATCH_SCOPE]),
    );
    assert.equal(hits.length, 1);
    assert.equal(hits[0]?.id, 'c-alpha');
    assertNoEvidence(JSON.stringify(hits));
  });

  it('matchingContacts same-tenant wrong role reveals no evidence', () => {
    const read = matchingContactsRead(
      [contact({ id: 'c-alpha', givenName: 'Alpha', familyName: 'Session' })],
      SESSION_NAME,
      session(['people.admin']),
    );
    const hits = matchingContacts(
      [contact({ id: 'c-alpha', givenName: 'Alpha', familyName: 'Session' })],
      SESSION_NAME,
      session(['people.admin']),
    );
    assert.equal(read.code, 'ROLE_FORBIDDEN');
    assert.deepEqual(hits, []);
    assert.equal(read.count, 0);
    assert.deepEqual(read.suggestions, []);
    assert.deepEqual(read.autocomplete, []);
    assertNoEvidence(JSON.stringify(hits));
  });

  it('matchingContacts missing session reveals no evidence', () => {
    const read = matchingContactsRead(
      [otherContact('c-zeta'), contact({ id: 'c-alpha', givenName: 'Alpha', familyName: 'Session' })],
      OTHER_NAME,
      null,
    );
    const hits = matchingContacts([otherContact('c-zeta')], OTHER_NAME);
    assert.equal(read.code, 'AUTH_REQUIRED');
    assert.deepEqual(hits, []);
    assert.equal(read.count, 0);
    assertNoEvidence(JSON.stringify(hits));
    assertNoEvidence(JSON.stringify(read));
  });

  it('matchingContacts cross-tenant exact name reveals no evidence', () => {
    const hits = matchingContacts([otherContact('c-zeta')], OTHER_NAME, session([CONTACT_MATCH_SCOPE]));
    assert.deepEqual(hits, []);
    assertNoEvidence(JSON.stringify(hits));
  });

  it('matchingContacts cross-tenant normalized name reveals no evidence', () => {
    const folded = matchingContacts(
      [otherContact('c-zeta')],
      OTHER_FOLDED,
      session([CONTACT_MATCH_SCOPE]),
    );
    const accented = matchingContacts(
      [otherContact('c-accent', { givenName: 'Zeta', familyName: 'Óther', email: null, phone: null })],
      'zeta other',
      session([CONTACT_MATCH_SCOPE]),
    );
    assert.deepEqual(folded, []);
    assert.deepEqual(accented, []);
    assertNoEvidence(JSON.stringify(folded));
    assertNoEvidence(JSON.stringify(accented));
    assert.equal(JSON.stringify(accented).includes(OTHER_ACCENT), false);
  });

  it('matchingContacts cross-tenant email reveals no evidence', () => {
    const hits = matchingContacts([otherContact('c-zeta')], OTHER_EMAIL, session([CONTACT_MATCH_SCOPE]));
    assert.deepEqual(hits, []);
    assertNoEvidence(JSON.stringify(hits));
  });

  it('matchingContacts cross-tenant normalized phone reveals no evidence', () => {
    const hits = matchingContacts(
      [otherContact('c-zeta')],
      OTHER_PHONE_QUERY,
      session([CONTACT_MATCH_SCOPE]),
    );
    assert.deepEqual(hits, []);
    assertNoEvidence(JSON.stringify(hits));
  });

  it('matchingContacts prefix autocomplete of another tenant reveals no evidence', () => {
    const read = matchingContactsRead([otherContact('c-zeta')], 'Zet', session([CONTACT_MATCH_SCOPE]));
    const hits = matchingContacts([otherContact('c-zeta')], 'Zet', session([CONTACT_MATCH_SCOPE]));
    assert.deepEqual(hits, []);
    assert.deepEqual(read.autocomplete, []);
    assert.deepEqual(read.suggestions, []);
    assert.equal(read.count, 0);
    assertNoEvidence(JSON.stringify(read));
  });

  it('matchingContacts count of another tenant is not revealed', () => {
    const others = Array.from({ length: OTHER_COUNT }, (_, index) =>
      otherContact(`c-zeta-${String.fromCharCode(97 + index)}`),
    );
    const read = matchingContactsRead(others, OTHER_NAME, session([CONTACT_MATCH_SCOPE]));
    const hits = matchingContacts(others, OTHER_NAME, session([CONTACT_MATCH_SCOPE]));
    assert.equal(hits.length, 0);
    assert.equal(read.count, 0);
    assert.notEqual(read.count, OTHER_COUNT);
    assert.notEqual(hits.length, OTHER_COUNT);
    assertNoEvidence(JSON.stringify(read));
  });
});
