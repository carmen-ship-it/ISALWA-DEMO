import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  PALETTE_GROUP_LIMIT,
  PALETTE_LIVE_ENTITY_KINDS,
  groupPaletteItems,
  orderPaletteItem,
  paletteHasLiveEntityHits,
  quotePaletteItem,
  opportunityPaletteItem,
  customerPaletteItem,
} from '@/lib/shell/command-palette';
import { extensionItemsForParty, matchingContacts } from '@/lib/productivity/search-extensions';
import { CONTACT_MATCH_SCOPE } from '@/lib/productivity/search-extensions';

const here = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(resolve(here, rel), 'utf8');
}

describe('Task 10 — global search depth', () => {
  it('SEARCHABLE live entity kinds cover commercial + work desks', () => {
    assert.ok(PALETTE_LIVE_ENTITY_KINDS.includes('customer'));
    assert.ok(PALETTE_LIVE_ENTITY_KINDS.includes('quote'));
    assert.ok(PALETTE_LIVE_ENTITY_KINDS.includes('order'));
    assert.ok(PALETTE_LIVE_ENTITY_KINDS.includes('work'));
    assert.ok(PALETTE_LIVE_ENTITY_KINDS.includes('approval'));
    assert.ok(PALETTE_LIVE_ENTITY_KINDS.includes('issue'));
    assert.ok(PALETTE_LIVE_ENTITY_KINDS.includes('commitment'));
    assert.ok(PALETTE_LIVE_ENTITY_KINDS.includes('document'));
    assert.equal(PALETTE_GROUP_LIMIT, 6);
  });

  it('QUOTE/ORDER results carry customer context and open correct destinations', () => {
    const quote = quotePaletteItem({
      quoteId: 'q1',
      partyId: 'party-1',
      quoteNumber: 'Q-000007',
      status: 'sent',
      totalCentavos: '10000',
      currency: 'BOB',
      customerLabel: 'DEMO CONSTRUCTORA ANDINA',
    });
    assert.equal(quote.label, 'Q-000007');
    assert.match(quote.detail ?? '', /DEMO CONSTRUCTORA ANDINA/);
    assert.equal(quote.href, '/clientes/party-1/cotizaciones/q1');
    assert.doesNotMatch(quote.label, /party-1|q1/);

    const order = orderPaletteItem({
      orderId: 'o1',
      partyId: 'party-2',
      orderNumber: 'O-000007',
      status: 'confirmed',
      customerLabel: 'DEMO MADERAS ORIENTE',
    });
    assert.equal(order.label, 'O-000007');
    assert.match(order.detail ?? '', /DEMO MADERAS ORIENTE/);
    assert.equal(order.href, '/clientes/party-2/pedidos/o1');

    const client = customerPaletteItem({
      partyId: 'party-1',
      displayName: 'DEMO CONSTRUCTORA ANDINA',
      legalName: null,
      status: 'active',
    });
    assert.equal(client.href, '/clientes/party-1');
    assert.match(client.label, /CONSTRUCTORA ANDINA/i);
  });

  it('CONTACT_SEARCH requires trusted session — no session yields no contact rows', () => {
    const party = {
      partyId: 'party-1',
      displayName: 'DEMO CONSTRUCTORA ANDINA',
      legalName: null,
      status: 'active',
      primaryPhone: null,
    };
    const contacts = [
      {
        id: 'c1',
        organizationId: 'org-a',
        givenName: 'Marco',
        familyName: 'Andrade',
        email: null,
        phone: '+59170011002',
        status: 'active',
      },
    ];
    assert.equal(matchingContacts(contacts, 'Marco').length, 0);
    const withoutSession = extensionItemsForParty(party, contacts, 'Marco');
    assert.equal(withoutSession.some((item) => item.label.includes('Marco')), false);

    const withSession = extensionItemsForParty(party, contacts, 'Marco', {
      organizationId: 'org-a',
      grantedScopes: [CONTACT_MATCH_SCOPE],
    });
    assert.equal(withSession.some((item) => item.label === 'Marco Andrade'), true);
    assert.equal(
      withSession.find((item) => item.label === 'Marco Andrade')?.href,
      '/clientes/party-1',
    );
  });

  it('UNAUTHORIZED / cross-tenant contact evidence stays empty', () => {
    const contacts = [
      {
        id: 'c-other',
        organizationId: 'org-other',
        givenName: 'Marco',
        familyName: 'Andrade',
        email: null,
        phone: null,
        status: 'active',
      },
    ];
    assert.equal(
      matchingContacts(contacts, 'Marco', {
        organizationId: 'org-a',
        grantedScopes: [CONTACT_MATCH_SCOPE],
      }).length,
      0,
    );
  });

  it('LIVE entity hits suppress shortcut domination helper', () => {
    assert.equal(paletteHasLiveEntityHits([]), false);
    assert.equal(
      paletteHasLiveEntityHits([
        { key: 'nav:x', kind: 'nav', label: 'Inicio', href: '/inicio' },
      ]),
      false,
    );
    assert.equal(
      paletteHasLiveEntityHits([
        { key: 'quote:q', kind: 'quote', label: 'Q-1', href: '/clientes/p/cotizaciones/q' },
      ]),
      true,
    );
    const grouped = groupPaletteItems([
      quotePaletteItem({
        quoteId: 'q1',
        partyId: 'p1',
        quoteNumber: 'Q-000007',
        status: 'sent',
        totalCentavos: '0',
        currency: 'BOB',
        customerLabel: 'Cliente Demo',
      }),
      opportunityPaletteItem({
        opportunityId: 'opp1',
        partyId: 'p1',
        title: 'Obra Andina',
        status: 'open',
        customerLabel: 'Cliente Demo',
      }),
    ]);
    assert.ok(grouped.some((g) => g.id === 'quote'));
    assert.ok(grouped.every((g) => g.items.length <= PALETTE_GROUP_LIMIT));
  });

  it('source contracts: contact session, datos nav, empty/error states, no mutations', () => {
    const actions = read('../productivity/actions.ts');
    const search = read('command-search.ts');
    const ui = read('../../components/shell/command-palette.tsx');
    const palette = read('command-palette.ts');

    assert.match(actions, /getTrustedAuthorization/);
    assert.match(actions, /organizationId: contact\.organizationId/);
    assert.match(actions, /extensionItemsForParty\(party, contacts, q, contactSession\)/);
    assert.match(actions, /client\.getParty\(party\.partyId\)/);
    assert.doesNotMatch(actions, /listPartyContacts/);


    assert.match(search, /attachCustomerLabels/);
    assert.match(search, /resolvePartyLabels/);
    assert.doesNotMatch(search, /people\.admin/);

    assert.match(ui, /hrefWithClientDataMode/);
    assert.match(ui, /paletteHasLiveEntityHits\(remote\)/);
    assert.match(ui, /No encontramos resultados para/);
    assert.match(ui, /Buscando…/);
    assert.match(ui, /No se pudo completar la búsqueda/);
    assert.match(ui, /Cerrar búsqueda/);
    assert.match(ui, /Escape/);
    assert.match(ui, /Enter/);
    assert.doesNotMatch(ui, /executeCommand|Approve|Reject|ConvertQuote/);

    assert.match(palette, /PALETTE_GROUP_LIMIT = 6/);
    assert.doesNotMatch(palette, /kind: 'product'/); // product kind type exists but live kinds omit it
    assert.ok(!PALETTE_LIVE_ENTITY_KINDS.includes('product' as never));
  });
});
