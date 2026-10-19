import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkContactNumber } from '@isalwa/os-contracts';
import { checkImportPhone, phoneMatchKey, readImportPhoneValues } from './normalize-phone';
import { parseMapsUrl } from './parse-maps-url';
import { normalizeImportRow } from './normalize-row';
import { analyzeRows, emptyCatalog } from './match';
import { buildReceipt, isRealClientImportEnabled } from './receipt';
import type { MatchCatalog } from './types';

describe('checkImportPhone (spreadsheet cleanup + shared rule)', () => {
  it('cleans spreadsheet forms and records what it changed', () => {
    assert.deepEqual(checkImportPhone('70012345', 'BO'), { e164: '+59170012345', reason: null, adjustments: [] });
    assert.equal(checkImportPhone('59170012345', 'BO').e164, '+59170012345');
    assert.deepEqual(checkImportPhone('59170012345', 'BO').adjustments, ['country_code_without_plus']);
    assert.equal(checkImportPhone('+591 700-12345', 'BO').e164, '+59170012345');
    assert.deepEqual(checkImportPhone('70012345.0', 'BO').adjustments, ['excel_decimal']);
    assert.deepEqual(checkImportPhone('070012345', 'BO').adjustments, ['leading_zero']);
    assert.deepEqual(checkImportPhone('700 123 45', 'BO').adjustments, ['separators']);
    assert.equal(phoneMatchKey('+59170012345'), '59170012345');
  });

  it('refuses with the shared rule reason instead of guessing', () => {
    assert.deepEqual(checkImportPhone('2212345', 'BO'), { e164: null, reason: 'wrong_length', adjustments: [] });
    assert.equal(checkImportPhone('80012345', 'BO').reason, 'unassigned_leading_digit');
    assert.equal(checkImportPhone('+54 11 1234 5678', 'BO').reason, 'other_country_code');
    assert.equal(checkImportPhone('sin número', 'BO').reason, 'invalid_characters');
    assert.equal(checkImportPhone('22123456', 'BO').e164, '+59122123456');
    // Same verdict as the shared contract used by UpdateContact at execute.
    for (const raw of ['2212345', '80012345', '22123456', '+59170012345']) {
      assert.equal(checkImportPhone(raw, 'BO').e164, checkContactNumber({ country: 'BO', number: raw }).ok
        ? (checkContactNumber({ country: 'BO', number: raw }) as { e164: string }).e164
        : null);
    }
  });

  it('keeps every value of a cell, valid or not, with its original text', () => {
    const values = readImportPhoneValues('celular', '2212345/70011111', 'BO');
    assert.deepEqual(
      values.map((v) => [v.valueId, v.original, v.status, v.normalized, v.reason]),
      [
        ['celular:0', '2212345', 'invalid', null, 'wrong_length'],
        ['celular:1', '70011111', 'accepted', '+59170011111', null],
      ],
    );
    // A fractional Excel number is flagged, never truncated into a different number.
    const [fraction] = readImportPhoneValues('celular', 70012345.5, 'BO');
    assert.equal(fraction?.original, '70012345.5');
    assert.equal(fraction?.status, 'invalid');
  });
});

describe('import phone review in the dry run', () => {
  const base = { section: 'B' as const, commercialName: 'Tienda', givenName: 'A', familyName: 'B' };

  it('splits separated mobiles and does not concatenate them', () => {
    const row = normalizeImportRow({ ...base, rowIndex: 0, commercialName: 'Split Phone Shop', celular: '70011111/70022222' });
    assert.equal(row.section, 'B');
    if (row.section !== 'B') return;
    assert.equal(row.whatsapp, '+59170011111');
    assert.equal(row.phone, '+59170011111');
    assert.equal(row.extraPhoneNotImported, 1);
    const analyzed = analyzeRows([row], emptyCatalog());
    assert.equal(analyzed[0]?.outcome, 'CREATE');
    const receipt = buildReceipt({ importBatchId: 'b', mode: 'dry_run', analyzed });
    assert.equal(receipt.phoneReview.extraNotImported, 1);
    assert.equal(receipt.phoneReview.code, 'EXTRA_PHONE_NOT_IMPORTED');
    assert.deepEqual(
      receipt.phoneReview.items.map((i) => [i.valueId, i.proposedAction]),
      [['celular:1', 'keep_in_import_record_only']],
    );
    assert.equal(receipt.wouldCreate, 1);
  });

  it('counts accepted and invalid values per row, masks originals and records the default country', () => {
    const rows = [
      normalizeImportRow({ ...base, rowIndex: 0, celular: '70011111' }),
      normalizeImportRow({ ...base, rowIndex: 1, commercialName: 'Tienda Dos', celular: '2212345' }),
      normalizeImportRow({ ...base, rowIndex: 2, commercialName: 'Tienda Tres', celular: '80012345', telefono: '33123456' }),
    ];
    const receipt = buildReceipt({ importBatchId: 'b', mode: 'dry_run', analyzed: analyzeRows(rows, emptyCatalog()) });
    const review = receipt.phoneReview;
    assert.equal(review.country, 'BO');
    assert.equal(review.countrySource, 'default');
    assert.deepEqual(
      [review.accepted, review.invalid, review.corrected, review.omitted, review.rowsNeedingCorrection],
      [2, 2, 0, 0, 2],
    );
    assert.equal(review.correctionCode, 'PHONE_CORRECTION_REQUIRED');
    assert.deepEqual(
      review.items.map((i) => [i.rowIndex, i.valueId, i.maskedOriginal, i.reason, i.proposedAction]),
      [
        [1, 'celular:0', '•••345', 'wrong_length', 'correct_or_omit'],
        [2, 'celular:0', '•••345', 'unassigned_leading_digit', 'correct_or_omit'],
      ],
    );
    assert.equal(JSON.stringify(receipt).includes('2212345'), false);
    assert.equal(JSON.stringify(receipt).includes('80012345'), false);
    // The row with only an invalid number has no stored phone but is not claimed to have none.
    const second = rows[1];
    assert.ok(second?.section === 'B' && second.phone === null && second.phoneInput.values.length === 1);
  });

  it('uses an explicit batch country when given', () => {
    const row = normalizeImportRow({ ...base, rowIndex: 0, celular: '70011111' }, { country: 'BO', countrySource: 'explicit' });
    const receipt = buildReceipt({
      importBatchId: 'b',
      mode: 'dry_run',
      analyzed: analyzeRows([row], emptyCatalog()),
      phoneContext: { country: 'BO', countrySource: 'explicit' },
    });
    assert.equal(receipt.phoneReview.countrySource, 'explicit');
    assert.equal(row.section === 'B' && row.phoneInput.countrySource, 'explicit');
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

  it('parses a plain comma in a Maps query', () => {
    const raw = 'https://www.google.com/maps?q=-17.123,-63.456';
    const parsed = parseMapsUrl(raw);
    assert.equal(parsed.kind, 'with_coords');
    assert.equal(parsed.latitude, -17.123);
    assert.equal(parsed.longitude, -63.456);
    assert.equal(parsed.provenanceUrl, raw);
  });

  it('decodes %2C and %2c before coordinate extraction and keeps the original URL', () => {
    for (const encoded of ['%2C', '%2c']) {
      const raw = `https://www.google.com/maps?q=-17.123${encoded}-63.456`;
      const parsed = parseMapsUrl(raw);
      assert.equal(parsed.kind, 'with_coords');
      assert.equal(parsed.latitude, -17.123);
      assert.equal(parsed.longitude, -63.456);
      assert.equal(parsed.provenanceUrl, raw);
    }
  });

  it('does not accept malformed or out-of-range coordinates', () => {
    const malformed = parseMapsUrl('https://www.google.com/maps?q=not-a-coordinate');
    assert.notEqual(malformed.kind, 'with_coords');
    const outOfRange = parseMapsUrl('https://www.google.com/maps?q=91.0,-63.456');
    assert.notEqual(outOfRange.kind, 'with_coords');
    assert.equal(outOfRange.latitude, null);
  });

  it('keeps short maps.app.goo.gl provenance-only even if the path contains %2C', () => {
    const raw = 'https://maps.app.goo.gl/AbCd%2CEf';
    const parsed = parseMapsUrl(raw);
    assert.equal(parsed.kind, 'provenance_only');
    assert.equal(parsed.latitude, null);
    assert.equal(parsed.longitude, null);
    assert.equal(parsed.provenanceUrl, raw);
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
