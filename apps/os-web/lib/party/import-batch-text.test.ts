import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseClientImportCustomerText } from '@/lib/party/import-batch-text';

describe('parseClientImportCustomerText', () => {
  it('parses comma rows into section B without inventing phones', () => {
    const parsed = parseClientImportCustomerText(
      'Ferretería Centro,Ana,Pérez,70011001\nVidriería Sur,Luis,Rojas',
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.rows.length, 2);
    assert.deepEqual(parsed.rows[0], {
      section: 'B',
      rowIndex: 1,
      commercialName: 'Ferretería Centro',
      givenName: 'Ana',
      familyName: 'Pérez',
      celular: '70011001',
    });
    assert.deepEqual(parsed.rows[1], {
      section: 'B',
      rowIndex: 2,
      commercialName: 'Vidriería Sur',
      givenName: 'Luis',
      familyName: 'Rojas',
    });
  });

  it('skips a header and accepts semicolon or tab separators', () => {
    const withHeader = parseClientImportCustomerText(
      'commercialName,givenName,familyName,celular,telefono\nCasa Norte;María;López;71112222;445566',
    );
    assert.equal(withHeader.ok, true);
    if (!withHeader.ok) return;
    assert.equal(withHeader.rows[0]?.telefono, '445566');

    const tabbed = parseClientImportCustomerText('Taller Uno\tPedro\tSoto');
    assert.equal(tabbed.ok, true);
    if (!tabbed.ok) return;
    assert.equal(tabbed.rows[0]?.commercialName, 'Taller Uno');
  });

  it('rejects empty paste and incomplete rows', () => {
    assert.equal(parseClientImportCustomerText('   ').ok, false);
    const incomplete = parseClientImportCustomerText('Solo comercial,,');
    assert.equal(incomplete.ok, false);
    if (incomplete.ok) return;
    assert.match(incomplete.error, /nombre comercial, nombre y apellido/);
  });
});
