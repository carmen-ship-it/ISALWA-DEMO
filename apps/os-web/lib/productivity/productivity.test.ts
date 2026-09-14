import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PartyTimelineEntryReadModel } from '@isalwa/os-contracts';
import { summarizeCoverage, countLabel } from './coverage';
import { PRODUCTIVITY_NOT_IMPLEMENTED } from './not-implemented';
import { phoneSearchVariant } from './phone-match';
import { parseUsefulRecents, rememberUsefulRecent, formatRecentDetail } from './recents';
import {
  extensionItemsForParty,
  matchingContacts,
  mergePaletteSearch,
  type SearchPartyHit,
} from './search-extensions';
import { canonicalViewHref, listSavedViews, pinCurrentView } from './saved-views';
import { contactsToTypeahead, filterHeldTypeahead, locationsToTypeahead, TYPEAHEAD_LOOKUP_POLICY } from './typeahead-lookup';
import { whatChangedFromTimeline } from './what-changed';
import type { PaletteItem } from '@/lib/shell/command-palette';

const party: SearchPartyHit = {
  partyId: 'pty-1',
  displayName: 'Comercial Norte',
  legalName: null,
  status: 'active',
  primaryPhone: '700-1111',
};

describe('search extensions', () => {
  it('does not invent a hit when the party and contacts do not match', () => {
    assert.deepEqual(matchingContacts([], 'ana'), []);
    const items = extensionItemsForParty(party, [], 'inexistente');
    assert.equal(items.some((item) => item.label === 'inexistente'), false);
    assert.equal(mergePaletteSearch([], []).length, 0);
  });

  it('labels a phone match from the stored phone and adds a contact only when one matched', () => {
    assert.equal(phoneSearchVariant('700-1111'), '7001111');
    assert.equal(phoneSearchVariant('7001111'), null);
    const items = extensionItemsForParty(
      party,
      [
        {
          id: 'c1',
          givenName: 'Ana',
          familyName: 'Quispe',
          email: null,
          phone: '700-1111',
          status: 'active',
        },
        {
          id: 'c2',
          givenName: 'Luis',
          familyName: 'Paz',
          email: null,
          phone: '111',
          status: 'active',
        },
      ],
      '700-1111',
    );
    assert.equal(items.some((item) => item.detail?.includes('700-1111')), true);
    assert.equal(items.some((item) => item.label === 'Ana Quispe'), true);
    assert.equal(items.some((item) => item.label === 'Luis Paz'), false);
    assert.equal(items.every((item) => item.href.startsWith('/clientes/')), true);
  });

  it('merges an extension onto the existing customer instead of duplicating the key', () => {
    const base: PaletteItem[] = [
      { key: 'customer:pty-1', kind: 'customer', label: 'Comercial Norte', href: '/clientes/pty-1' },
    ];
    const merged = mergePaletteSearch(base, [
      { key: 'customer:pty-1', kind: 'customer', label: 'Comercial Norte', detail: 'Teléfono 700-1111', href: '/clientes/pty-1' },
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.detail, 'Teléfono 700-1111');
  });
});

describe('saved views', () => {
  it('opens existing lists and rejects a new query key, map, or report', () => {
    assert.equal(canonicalViewHref('/cotizaciones?status=submitted'), '/cotizaciones?status=submitted');
    assert.equal(canonicalViewHref('/trabajo?view=overdue&cursor=abc'), '/trabajo?view=overdue');
    assert.equal(canonicalViewHref('/mapa'), null);
    assert.equal(canonicalViewHref('/clientes?ownerMemberId=mem-1'), '/clientes');
    assert.equal(canonicalViewHref('https://example.com/clientes'), null);
    const pinned = pinCurrentView([], '/oportunidades?status=open&panel=quote:abc');
    assert.equal(pinned?.[0]?.href, '/oportunidades?status=open');
    assert.equal(listSavedViews([]).some((view) => view.href.includes('mapa')), false);
  });
});

describe('recents', () => {
  it('prefixes the useful kind and drops an unsafe href', () => {
    assert.equal(formatRecentDetail('quote', 'Enviada'), 'Cotización · Enviada');
    assert.equal(formatRecentDetail('quote', 'Cotización · Enviada'), 'Cotización · Enviada');
    const stored = rememberUsefulRecent([], {
      key: 'quote:q1',
      kind: 'quote',
      label: 'COT-12',
      detail: 'Enviada',
      href: '/clientes/pty-1/cotizaciones/q1',
    });
    assert.equal(stored[0]?.detail, 'Cotización · Enviada');
    const shown = parseUsefulRecents(JSON.stringify([
      stored[0],
      { key: 'bad', label: 'Externo', href: '//evil.example', kind: 'customer' },
    ]));
    assert.equal(shown.length, 1);
    assert.equal(shown[0]?.label, 'COT-12');
    assert.equal(shown[0]?.detail?.includes('Cotización'), true);
  });
});

describe('coverage', () => {
  it('counts only the page it was given, keeps commitments unimplemented, and does not link another person to the viewer list', () => {
    const self = summarizeCoverage({
      subject: 'self',
      memberId: 'mem-1',
      memberLabel: 'Usted',
      openWork: {
        items: [
          { title: 'Llamar', subjectType: 'party', subjectId: 'pty-1', status: 'open' },
          { title: 'Llamar otra vez', subjectType: 'party', subjectId: 'pty-1', status: 'open' },
        ],
        truncated: true,
      },
      overdueWork: { items: [], truncated: false },
      openFollowUps: { items: [{ title: 'Llamar', status: 'open' }], truncated: false },
      openOpportunities: { items: [], truncated: false },
      submittedQuotes: { items: [{ title: 'COT-1', status: 'submitted' }], truncated: false },
      pendingApprovals: { items: [{ title: 'Aprobación', status: 'pending' }], truncated: false },
    });
    assert.equal(self.openWork.status === 'available' && self.openWork.count, 2);
    assert.equal(countLabel(self.customersWithOpenWork), 'Al menos 1');
    assert.equal(self.commitments.status, 'not_implemented');
    assert.equal(self.reassignment, 'not_available');
    assert.equal(self.links.quotes, '/cotizaciones?status=submitted');
    assert.equal(self.links.openWork?.includes('owner'), false);

    const other = summarizeCoverage({
      subject: 'member',
      memberId: 'mem-2',
      memberLabel: 'Ana',
      openWork: { items: [{ title: 'Visita', status: 'open' }], truncated: false },
      overdueWork: 'denied',
      openFollowUps: 'denied',
      openOpportunities: 'unavailable',
      submittedQuotes: { items: [], truncated: false },
      pendingApprovals: {
        items: [
          { title: 'Aprobación', status: 'pending', approverMemberId: 'mem-9' },
          { title: 'Aprobación', status: 'pending', approverMemberId: 'mem-2' },
        ],
        truncated: false,
      },
    });
    assert.deepEqual(other.links, {});
    assert.equal(other.overdueWork.status, 'not_authorized');
    assert.equal(other.pendingApprovals.status === 'available' && other.pendingApprovals.count, 1);
    assert.equal(other.openOpportunities.status, 'unavailable');
  });
});

describe('what changed', () => {
  it('keeps recorded changes and does not invent a commitment or an unlisted event', () => {
    const quote: PartyTimelineEntryReadModel = {
      entryId: 'e1',
      organizationId: 'org',
      partyId: 'pty 1',
      eventType: 'quote.submitted',
      occurredAt: '2026-09-02T12:00:00.000Z',
      actorMemberId: null,
      correlationId: 'c1',
      primaryEntityType: 'quote',
      primaryEntityId: 'quo-1',
      facts: { quoteId: 'quo-1', quoteNumber: 'COT-9' },
    };
    const created: PartyTimelineEntryReadModel = {
      ...quote,
      entryId: 'e2',
      eventType: 'party.created',
      occurredAt: '2026-09-03T12:00:00.000Z',
      facts: { displayName: 'Comercial Norte' },
    };
    const items = whatChangedFromTimeline([created, quote]);
    assert.equal(items.length, 1);
    assert.equal(items[0]?.label, 'Cotización enviada');
    assert.equal(items[0]?.href, '/clientes/pty%201/cotizaciones/quo-1');
    assert.equal(items.some((item) => item.label.toLocaleLowerCase('es').includes('compromiso')), false);
    assert.equal(PRODUCTIVITY_NOT_IMPLEMENTED.some((gap) => gap.id === 'commitments'), true);
    assert.equal(PRODUCTIVITY_NOT_IMPLEMENTED.some((gap) => gap.id === 'report-builder'), true);
    assert.equal(PRODUCTIVITY_NOT_IMPLEMENTED.some((gap) => gap.id === 'org-what-changed'), true);
  });
});

describe('typeahead lookup policy', () => {
  it('keeps member and approver on a bounded admin query and contact or location on held records', () => {
    const member = TYPEAHEAD_LOOKUP_POLICY.find((item) => item.kind === 'member');
    const approver = TYPEAHEAD_LOOKUP_POLICY.find((item) => item.kind === 'approver');
    const contact = TYPEAHEAD_LOOKUP_POLICY.find((item) => item.kind === 'contact');
    const location = TYPEAHEAD_LOOKUP_POLICY.find((item) => item.kind === 'location');
    assert.equal(member?.mode, 'admin_query');
    assert.equal(approver?.mode, 'admin_query');
    assert.equal(contact?.mode, 'held_records_only');
    assert.equal(location?.mode, 'party_scoped_held_records');
    const options = contactsToTypeahead([
      { id: 'c-secret', givenName: 'Ana', familyName: 'Quispe', phone: '7001111', status: 'active' },
      { id: 'c-off', givenName: 'Luis', familyName: 'Paz', phone: null, status: 'ended' },
    ]);
    assert.deepEqual(filterHeldTypeahead(options, 'quispe'), [
      { value: 'c-secret', label: 'Ana Quispe · 7001111' },
    ]);
    assert.equal(filterHeldTypeahead(options, 'c-secret').length, 0);
    const places = locationsToTypeahead([
      { id: 'loc-1', label: 'Depósito', addressText: 'El Alto', status: 'active', hasCoordinates: false },
    ]);
    assert.equal(filterHeldTypeahead(places, 'alto')[0]?.label, 'Depósito · El Alto');
    assert.equal(places[0]?.label.includes('coord'), false);
  });
});
