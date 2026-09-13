import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBoliviaPhone, phoneMatchKey } from './normalize-phone';
import { parseMapsUrl } from './parse-maps-url';
import { normalizeImportRow } from './normalize-row';
import { analyzeRows, emptyCatalog } from './match';
import { buildReceipt, isRealClientImportEnabled } from './receipt';
import type { MatchCatalog } from './types';

describe('normalizeBoliviaPhone', () => {
  it('normalizes BO mobile digit strings and excel numbers', () => {
    assert.equal(normalizeBoliviaPhone('70012345'), '+59170012345');
    assert.equal(normalizeBoliviaPhone(70012345), '+59170012345');
    assert.equal(normalizeBoliviaPhone('59170012345'), '+59170012345');
    assert.equal(normalizeBoliviaPhone('+591 700-12345'), '+59170012345');
    assert.equal(normalizeBoliviaPhone('70012345.0'), '+59170012345');
    assert.equal(phoneMatchKey('+59170012345'), '59170012345');
  });
});

describe('parseMapsUrl', () => {
  it('extracts coords from explicit Maps URLs offline', () => {
    const parsed = parseMapsUrl('https://www.google.com/maps/@-16.5,-68.15,17z');
    assert.equal(parsed.kind, 'with_coords');
    assert.equal(parsed.latitude, -16.5);
    assert.equal(parsed.longitude, -68.15);
    assert.ok(parsed.provenanceUrl);
  });

  it('treats short maps.app.goo.gl as provenance-only', () => {
    const parsed = parseMapsUrl('https://maps.app.goo.gl/AbCdEfGhIjKlMnOp');
    assert.equal(parsed.kind, 'provenance_only');
    assert.equal(parsed.latitude, null);
    assert.equal(parsed.longitude, null);
    assert.ok(parsed.provenanceUrl?.includes('maps.app.goo.gl'));
  });

  it('skips invalid GPS without rejecting customer validity upstream', () => {
    const parsed = parseMapsUrl('not-a-url');
    assert.equal(parsed.kind, 'skipped');
    assert.equal(parsed.provenanceUrl, null);
  });
});

describe('matching', () => {
  it('exact commercial-name + phone → MATCH', () => {
    const catalog: MatchCatalog = {
      parties: [
        {
          partyId: 'p1',
          partyKind: 'organization',
          displayName: 'Acme Comercial',
          status: 'active',
          nitKeys: [],
          contacts: [
            {
              contactId: 'c1',
              givenName: 'Ana',
              familyName: 'Perez',
              email: null,
              phone: '+59170011111',
              whatsapp: '+59170011111',
            },
          ],
        },
      ],
    };
    const row = normalizeImportRow({
      section: 'B',
      rowIndex: 0,
      commercialName: 'Acme Comercial',
      givenName: 'Ana',
      familyName: 'Perez',
      celular: '70011111',
    });
    const analyzed = analyzeRows([row], catalog);
    assert.equal(analyzed[0]?.outcome, 'MATCH');
  });

  it('exact phone-only → POSSIBLE_DUPLICATE', () => {
    const catalog: MatchCatalog = {
      parties: [
        {
          partyId: 'p1',
          partyKind: 'organization',
          displayName: 'Other Name',
          status: 'active',
          nitKeys: [],
          contacts: [
            {
              contactId: 'c1',
              givenName: 'X',
              familyName: 'Y',
              email: null,
              phone: '+59170022222',
              whatsapp: null,
            },
          ],
        },
      ],
    };
    const row = normalizeImportRow({
      section: 'B',
      rowIndex: 0,
      commercialName: 'Brand New Shop',
      givenName: 'Luis',
      familyName: 'Rojas',
      celular: '70022222',
    });
    const analyzed = analyzeRows([row], catalog);
    assert.equal(analyzed[0]?.outcome, 'POSSIBLE_DUPLICATE');
  });

  it('name+phone MATCH when both agree', () => {
    const catalog: MatchCatalog = {
      parties: [
        {
          partyId: 'p9',
          partyKind: 'organization',
          displayName: 'Tienda Norte',
          status: 'active',
          nitKeys: [],
          contacts: [
            {
              contactId: 'c9',
              givenName: 'Mar',
              familyName: 'Sol',
              email: null,
              phone: '+59171112222',
              whatsapp: '+59171112222',
            },
          ],
        },
      ],
    };
    const analyzed = analyzeRows(
      [
        normalizeImportRow({
          section: 'B',
          rowIndex: 0,
          commercialName: 'Tienda Norte',
          givenName: 'Mar',
          familyName: 'Sol',
          celular: '71112222',
        }),
      ],
      catalog,
    );
    assert.equal(analyzed[0]?.outcome, 'MATCH');
    assert.equal(analyzed[0]?.entityRefs.matchedPartyId, 'p9');
  });

  it('conflicting name vs phone parties → REQUIRES_REVIEW', () => {
    const catalog: MatchCatalog = {
      parties: [
        {
          partyId: 'pa',
          partyKind: 'organization',
          displayName: 'Alpha Shop',
          status: 'active',
          nitKeys: [],
          contacts: [],
        },
        {
          partyId: 'pb',
          partyKind: 'organization',
          displayName: 'Beta Shop',
          status: 'active',
          nitKeys: [],
          contacts: [
            {
              contactId: 'cb',
              givenName: 'B',
              familyName: 'B',
              email: null,
              phone: '+59173334444',
              whatsapp: null,
            },
          ],
        },
      ],
    };
    const analyzed = analyzeRows(
      [
        normalizeImportRow({
          section: 'B',
          rowIndex: 0,
          commercialName: 'Alpha Shop',
          givenName: 'X',
          familyName: 'Y',
          celular: '73334444',
        }),
      ],
      catalog,
    );
    assert.equal(analyzed[0]?.outcome, 'REQUIRES_REVIEW');
    assert.equal(analyzed[0]?.errorCode, 'CONFLICTING_MATCH_EVIDENCE');
  });

  it('intra-batch duplicate commercial names', () => {
    const analyzed = analyzeRows(
      [
        normalizeImportRow({
          section: 'B',
          rowIndex: 0,
          commercialName: 'Dup Shop',
          givenName: 'A',
          familyName: 'A',
          celular: '70010001',
        }),
        normalizeImportRow({
          section: 'B',
          rowIndex: 1,
          commercialName: 'Dup Shop',
          givenName: 'B',
          familyName: 'B',
          celular: '70010002',
        }),
      ],
      emptyCatalog(),
    );
    assert.equal(analyzed[0]?.outcome, 'CREATE');
    assert.equal(analyzed[1]?.outcome, 'POSSIBLE_DUPLICATE');
  });

  it('invalid GPS skipped but customer still CREATE', () => {
    const analyzed = analyzeRows(
      [
        normalizeImportRow({
          section: 'B',
          rowIndex: 0,
          commercialName: 'Valid Customer',
          givenName: 'A',
          familyName: 'B',
          celular: '70099999',
          mapsUrl: 'garbage',
        }),
      ],
      emptyCatalog(),
    );
    assert.equal(analyzed[0]?.outcome, 'CREATE');
    assert.equal(analyzed[0]?.normalized.section === 'B' && analyzed[0].normalized.location.kind, 'skipped');
  });

  it('staff rows are person candidates never CREATE', () => {
    const analyzed = analyzeRows(
      [
        normalizeImportRow({
          section: 'A',
          rowIndex: 0,
          givenName: 'Staff',
          familyName: 'One',
          email: 'staff.one@example.com',
          cargo: 'ASESOR DE VENTA',
        }),
      ],
      emptyCatalog(),
    );
    assert.equal(analyzed[0]?.outcome, 'REQUIRES_REVIEW');
    assert.equal(analyzed[0]?.errorCode, 'STAFF_PERSON_CANDIDATE');
  });
});

describe('dry-run receipt', () => {
  it('builds receipt shape/counts without PII in errors', () => {
    const analyzed = analyzeRows(
      [
        normalizeImportRow({
          section: 'B',
          rowIndex: 0,
          commercialName: 'Shop A',
          givenName: 'A',
          familyName: 'A',
          celular: '70011111',
          mapsUrl: 'https://maps.app.goo.gl/xyz',
        }),
        normalizeImportRow({
          section: 'B',
          rowIndex: 1,
          commercialName: 'Shop B',
          givenName: 'B',
          familyName: 'B',
          mapsUrl: 'https://www.google.com/maps/@-16.5,-68.15,17z',
        }),
        normalizeImportRow({
          section: 'A',
          rowIndex: 0,
          givenName: 'Staff',
          familyName: 'Two',
        }),
      ],
      emptyCatalog(),
    );
    const receipt = buildReceipt({
      importBatchId: 'batch-1',
      mode: 'dry_run',
      analyzed,
    });
    assert.equal(receipt.rowsReceived, 3);
    assert.equal(receipt.wouldCreate, 2);
    assert.equal(receipt.manualReview, 1);
    assert.equal(receipt.location.provenanceOnly, 1);
    assert.equal(receipt.location.withCoords, 1);
    assert.equal(receipt.staff.personCandidates, 1);
    assert.equal(receipt.staff.blockedAuthCreates, 0);
    assert.equal(receipt.gates.realDataImportAllowed, false);
    for (const err of receipt.errors) {
      assert.doesNotMatch(err.message, /\+591|@|maps\.|goo\.gl/i);
    }
  });

  it('execute gate defaults disabled', () => {
    const prev = process.env.OS_REAL_CLIENT_IMPORT_ENABLED;
    delete process.env.OS_REAL_CLIENT_IMPORT_ENABLED;
    assert.equal(isRealClientImportEnabled(), false);
    if (prev !== undefined) process.env.OS_REAL_CLIENT_IMPORT_ENABLED = prev;
  });
});
