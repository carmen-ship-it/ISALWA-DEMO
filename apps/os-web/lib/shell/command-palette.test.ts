import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  applyPick,
  customerPaletteItem,
  groupPaletteItems,
  isFollowUpSubject,
  paletteActions,
  paletteNav,
  parseRecents,
  quotePaletteItem,
} from './command-palette';
import { safeInternalPath } from './safe-next';

describe('command palette authorization', () => {
  it('hides customer create and invite unless those scopes are already held', () => {
    const plain = paletteActions({ canCreateCustomer: false, canInvite: false }).map((item) => item.label);
    assert.deepEqual(plain, ['Nueva oportunidad', 'Crear cotización', 'Registrar seguimiento']);
    assert.equal(plain.includes('Agregar cliente'), false);
    assert.equal(plain.includes('Invitar empleado'), false);

    const admin = paletteActions({ canCreateCustomer: true, canInvite: true }).map((item) => item.label);
    assert.equal(admin.includes('Agregar cliente'), true);
    assert.equal(admin.includes('Invitar empleado'), true);
  });

  it('hides Administración from navigation without people.admin', () => {
    assert.equal(
      paletteNav(false).some((item) => item.href === '/administracion'),
      false,
    );
    assert.equal(
      paletteNav(true).some((item) => item.href === '/administracion'),
      true,
    );
  });

  it('does not use a raw id as the customer or quote label', () => {
    const customer = customerPaletteItem({
      partyId: 'pty_secret',
      displayName: 'Casa Demo',
      legalName: null,
      status: 'active',
    });
    assert.equal(customer.label, 'Casa Demo');
    assert.equal(customer.label.includes('pty_secret'), false);
    assert.equal(customer.partyId, 'pty_secret');

    const quote = quotePaletteItem({
      quoteId: 'quo_1',
      partyId: 'pty_secret',
      quoteNumber: 'COT-12',
      status: 'submitted',
      totalCentavos: '150000',
      currency: 'BOB',
    });
    assert.equal(quote.label, 'COT-12');
    assert.equal(quote.label.includes('quo_1'), false);
  });

  it('routes pick actions onto existing pages', () => {
    const customer = customerPaletteItem({
      partyId: 'pty 1',
      displayName: 'Casa Demo',
      legalName: null,
      status: 'active',
    });
    const opportunity = applyPick(customer, 'customer-opportunity');
    assert.equal(opportunity?.href, '/clientes/pty%201/oportunidades/nueva');
    const followUp = applyPick(customer, 'customer-follow-up');
    assert.equal(followUp?.href, '/clientes/pty%201#trabajo');
    assert.equal(applyPick(customer, 'opportunity-quote'), null);
  });

  it('treats party follow-up subjects as follow-ups, not generic work', () => {
    assert.equal(isFollowUpSubject('party'), true);
    assert.equal(isFollowUpSubject('commercial_account'), true);
    assert.equal(isFollowUpSubject('quote'), false);
  });

  it('groups results without inventing an empty section', () => {
    const groups = groupPaletteItems([
      customerPaletteItem({
        partyId: 'pty_1',
        displayName: 'Casa Demo',
        legalName: null,
        status: 'deactivated',
      }),
    ]);
    assert.deepEqual(
      groups.map((group) => group.id),
      ['customer'],
    );
    assert.match(groups[0]?.items[0]?.detail ?? '', /Inactiva/);
  });

  it('rejects recents that are not internal links', () => {
    const items = parseRecents(
      JSON.stringify([
        { key: 'ok', label: 'Casa', href: '/clientes/1' },
        { key: 'bad', label: 'Fuera', href: 'https://example.com' },
        { key: 'bad2', label: 'Relativo', href: '//evil' },
      ]),
    );
    assert.equal(items.length, 1);
    assert.equal(items[0]?.href, '/clientes/1');
  });
});

describe('post-login path', () => {
  it('accepts an internal path and rejects login loops and protocol-relative URLs', () => {
    assert.equal(safeInternalPath('/clientes/1'), '/clientes/1');
    assert.equal(safeInternalPath('/login'), null);
    assert.equal(safeInternalPath('//evil.example'), null);
    assert.equal(safeInternalPath('https://evil.example'), null);
    assert.equal(safeInternalPath('/\\evil'), null);
  });
});

describe('palette search stays on the session', () => {
  it('does not accept an organization override', () => {
    const source = readFileSync(new URL('./command-search.ts', import.meta.url), 'utf8');
    assert.match(source, /export async function searchPalette\(query: string\)/);
    assert.doesNotMatch(source, /organizationId\s*[:=]/);
    assert.match(source, /getServerOsAuthContext/);
  });
});
