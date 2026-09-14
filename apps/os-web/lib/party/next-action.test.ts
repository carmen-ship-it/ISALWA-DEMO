import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import { sampleOpportunity, sampleOrder, samplePartyTimelineEntry, sampleQuote } from '@/lib/commercial/fixtures';
import { samplePartyDetail } from '@/lib/party/fixtures';
import { overdueWork, sampleWork } from '@/lib/work/fixtures';
import { staffFacingSubject } from '@/lib/work/staff-subject';
import { formatWorkDueLine } from '@/lib/work/due-order';
import {
  CLIENTE_360_COPY,
  CLIENTE_360_OMITTED_SIGNALS,
  composeCliente360,
  partyListLocationMeta,
  type Cliente360ComposeInput,
  type LoadedSection,
  type LocationSignal,
} from './next-action';

const AS_OF = new Date('2026-08-24T12:00:00.000Z');
const MAPS_URL = 'https://maps.google.com/maps?q=shared-fixture';

function empty<T>(): LoadedSection<T> {
  return { status: 'ok', items: [] };
}

function base(overrides: Partial<Cliente360ComposeInput> = {}): Cliente360ComposeInput {
  const contact = samplePartyDetail.contacts[0];
  return {
    partyId: samplePartyDetail.party.id,
    displayName: samplePartyDetail.party.displayName,
    partyStatus: samplePartyDetail.party.status,
    mergedIntoPartyId: samplePartyDetail.party.mergedIntoPartyId,
    roles: samplePartyDetail.roles,
    contacts: [
      {
        id: contact.id,
        givenName: contact.givenName,
        familyName: contact.familyName,
        title: contact.title,
        phone: contact.phone,
        status: contact.status,
      },
    ],
    commercialAccount: {
      status: 'active',
      ownerMemberId: 'member-1',
    },
    ownerLabel: 'Ana Quispe',
    canReassignOwner: false,
    locations: empty(),
    work: empty(),
    timeline: empty(),
    opportunities: empty(),
    quotes: empty(),
    orders: empty(),
    staleProjection: false,
    asOf: AS_OF,
    ...overrides,
  };
}

function location(patch: Partial<LocationSignal>): LocationSignal {
  return {
    status: 'active',
    label: 'Planta',
    addressText: null,
    latitude: null,
    longitude: null,
    provenanceUrl: null,
    ...patch,
  };
}

describe('Cliente 360 next action', () => {
  it('uses the stored follow-up title and does not rewrite it', () => {
    const composed = composeCliente360(base({ work: { status: 'ok', items: [sampleWork] } }));
    const expected = staffFacingSubject({
      title: sampleWork.title,
      description: sampleWork.description,
      subjectType: sampleWork.subjectType,
      customerName: samplePartyDetail.party.displayName,
    });

    assert.equal(composed.nextAction.kind, 'recorded_follow_up');
    assert.equal(composed.nextAction.statement, expected);
    assert.equal(composed.now, expected);
    assert.equal(composed.nextAction.workItemId, sampleWork.workItemId);
    assert.equal(
      composed.nextAction.dueText,
      formatWorkDueLine(sampleWork, { asOf: AS_OF }).text,
    );
    assert.equal(composed.nextAction.overdue, false);
    assert.match(composed.why.join(' '), /seguimiento pendiente ya registrado/);
    assert.doesNotMatch(composed.nextAction.statement, /llamar|whatsapp|crear oportunidad/i);
  });

  it('ranks the overdue recorded follow-up ahead of a later one', () => {
    const later: WorkSummaryReadModel = {
      ...sampleWork,
      workItemId: 'work-later',
      title: 'Confirmar cantidades',
      dueAt: '2026-09-01T15:00:00.000Z',
    };
    const composed = composeCliente360(
      base({ work: { status: 'ok', items: [later, overdueWork] } }),
    );

    assert.equal(composed.nextAction.workItemId, overdueWork.workItemId);
    assert.equal(composed.nextAction.overdue, true);
    assert.equal(
      composed.blockers.some((item) => item.code === 'overdue_follow_up'),
      true,
    );
  });

  it('ignores completed work and does not invent a replacement', () => {
    const completed: WorkSummaryReadModel = {
      ...sampleWork,
      status: 'completed',
      completedAt: '2026-08-23T12:00:00.000Z',
    };
    const composed = composeCliente360(base({ work: { status: 'ok', items: [completed] } }));

    assert.equal(composed.nextAction.kind, 'insufficient');
    assert.equal(composed.nextAction.statement, CLIENTE_360_COPY.insufficient);
    assert.match(composed.why.join(' '), /No se inventa una llamada/);
  });

  it('says the signal is insufficient when a submitted quote is the only commercial fact', () => {
    const composed = composeCliente360(
      base({
        quotes: { status: 'ok', items: [sampleQuote] },
        opportunities: { status: 'ok', items: [sampleOpportunity] },
        orders: { status: 'ok', items: [sampleOrder] },
      }),
    );

    assert.equal(composed.nextAction.kind, 'insufficient');
    assert.equal(composed.nextAction.href, null);
    assert.match(composed.relationship.summary, /oportunidad abierta/);
    assert.match(composed.relationship.summary, new RegExp(sampleQuote.quoteNumber));
    assert.match(composed.relationship.summary, new RegExp(sampleOrder.orderNumber));
    assert.match(composed.why.join(' '), /no fija el siguiente paso/);
    assert.doesNotMatch(composed.nextAction.statement, /seguimiento de la cotización|enviar|llamar/i);
  });

  it('does not treat an unread follow-up list as an empty one', () => {
    const composed = composeCliente360(base({ work: { status: 'unavailable' } }));

    assert.equal(composed.nextAction.kind, 'unreadable');
    assert.equal(composed.nextAction.statement, CLIENTE_360_COPY.unreadable);
    assert.doesNotMatch(composed.now, /No hay seguimiento pendiente/);
    assert.equal(
      composed.blockers.some((item) => item.code === 'work_unreadable'),
      true,
    );
  });

  it('asks to assign an owner only when that command is already allowed', () => {
    const missingOwner = base({
      commercialAccount: { status: 'active', ownerMemberId: null },
      ownerLabel: null,
      canReassignOwner: false,
    });
    const denied = composeCliente360(missingOwner);
    const allowed = composeCliente360({ ...missingOwner, canReassignOwner: true });

    assert.equal(denied.nextAction.kind, 'insufficient');
    assert.equal(denied.owner.assigned, false);
    assert.equal(denied.owner.note, CLIENTE_360_COPY.ownerAbsent);
    assert.equal(
      denied.blockers.some((item) => item.code === 'no_owner'),
      true,
    );
    assert.notEqual(denied.nextAction.statement, CLIENTE_360_COPY.assignOwner);

    assert.equal(allowed.nextAction.kind, 'assign_owner');
    assert.equal(allowed.nextAction.statement, CLIENTE_360_COPY.assignOwner);
    assert.equal(allowed.nextAction.href, '/clientes/party-1#resumen');
  });

  it('points a merged record at the stored principal, not a commercial action', () => {
    const composed = composeCliente360(
      base({
        partyStatus: 'merged',
        mergedIntoPartyId: 'party-survivor',
        work: { status: 'ok', items: [sampleWork] },
      }),
    );

    assert.equal(composed.nextAction.kind, 'open_principal_record');
    assert.equal(composed.nextAction.statement, CLIENTE_360_COPY.openPrincipal);
    assert.equal(composed.nextAction.href, '/clientes/party-survivor');
    assert.notEqual(composed.nextAction.workItemId, sampleWork.workItemId);
  });

  it('keeps coordinates distinct from a Maps provenance link', () => {
    const composed = composeCliente360(
      base({
        locations: {
          status: 'ok',
          items: [
            location({
              latitude: -16.5,
              longitude: -68.15,
              provenanceUrl: MAPS_URL,
              addressText: 'Calle fixture 10',
            }),
          ],
        },
      }),
    );

    assert.equal(composed.location.state, 'coordinates');
    assert.equal(composed.location.coordinates, '-16.5, -68.15');
    assert.notEqual(composed.location.coordinates, MAPS_URL);
    assert.equal(composed.location.provenance?.href, MAPS_URL);
    assert.equal(composed.location.provenance?.label, 'Abrir origen en Maps');
    assert.equal(composed.location.address, 'Calle fixture 10');
    assert.doesNotMatch(composed.location.summary, /Maps/);
    assert.match(composed.why.join(' '), /se muestran aparte/);
  });

  it('does not turn a provenance-only Maps link into a location or a next action', () => {
    const composed = composeCliente360(
      base({
        locations: {
          status: 'ok',
          items: [location({ provenanceUrl: MAPS_URL })],
        },
      }),
    );

    assert.equal(composed.location.state, 'provenance_only');
    assert.equal(composed.location.coordinates, null);
    assert.equal(composed.location.summary, CLIENTE_360_COPY.provenanceNotLocation);
    assert.equal(composed.nextAction.kind, 'insufficient');
    assert.notEqual(composed.nextAction.statement, composed.location.provenance?.label);
    assert.equal(
      composed.blockers.some((item) => item.code === 'provenance_not_location'),
      true,
    );
    assert.doesNotMatch(composed.now, /maps\.google/i);
  });

  it('takes the latest stored activity and does not treat it as the next action', () => {
    const older = {
      ...samplePartyTimelineEntry,
      entryId: 'tl-older',
      occurredAt: '2026-08-19T10:00:00.000Z',
      eventType: 'party.created',
    };
    const newer = {
      ...samplePartyTimelineEntry,
      entryId: 'tl-newer',
      occurredAt: '2026-08-21T10:00:00.000Z',
    };
    const composed = composeCliente360(
      base({ timeline: { status: 'ok', items: [older, newer] } }),
    );

    assert.equal(composed.latestActivity.state, 'present');
    assert.equal(composed.latestActivity.label, 'Oportunidad creada');
    assert.equal(composed.latestActivity.occurredAt, newer.occurredAt);
    assert.equal(composed.nextAction.kind, 'insufficient');
    assert.notEqual(composed.now, composed.latestActivity.label);
  });

  it('breaks latest-activity ties by entry id', () => {
    const left = {
      ...samplePartyTimelineEntry,
      entryId: 'tl-a',
      occurredAt: '2026-08-21T10:00:00.000Z',
      facts: { ...samplePartyTimelineEntry.facts, title: 'Hecho A' },
    };
    const right = {
      ...samplePartyTimelineEntry,
      entryId: 'tl-b',
      occurredAt: '2026-08-21T10:00:00.000Z',
      facts: { ...samplePartyTimelineEntry.facts, title: 'Hecho B' },
    };
    const composed = composeCliente360(
      base({ timeline: { status: 'ok', items: [left, right] } }),
    );
    const again = composeCliente360(
      base({ timeline: { status: 'ok', items: [right, left] } }),
    );
    assert.match(composed.latestActivity.summary ?? '', /Hecho B/);
    assert.equal(again.latestActivity.summary, composed.latestActivity.summary);
  });

  it('uses the first active contact and does not invent a phone', () => {
    const contact = samplePartyDetail.contacts[0];
    const withoutPhone = composeCliente360(
      base({
        contacts: [
          {
            id: contact.id,
            givenName: contact.givenName,
            familyName: contact.familyName,
            title: contact.title,
            phone: null,
            status: 'active',
          },
        ],
      }),
    );
    const inactiveOnly = composeCliente360(
      base({
        contacts: [
          {
            id: contact.id,
            givenName: contact.givenName,
            familyName: contact.familyName,
            title: contact.title,
            phone: contact.phone,
            status: 'inactive',
          },
        ],
      }),
    );

    assert.equal(withoutPhone.primaryContact.source, 'first_active_contact');
    assert.equal(withoutPhone.primaryContact.name, 'María Fernández');
    assert.equal(withoutPhone.primaryContact.hasPhone, false);
    assert.equal(withoutPhone.primaryContact.phone, null);
    assert.equal(inactiveOnly.primaryContact.source, 'none');
    assert.equal(inactiveOnly.primaryContact.phone, null);
    assert.equal(inactiveOnly.primaryContact.summary, CLIENTE_360_COPY.noContact);
    assert.doesNotMatch(withoutPhone.now, /\d{6,}/);
  });

  it('keeps a stale reading from changing the stored next action', () => {
    const composed = composeCliente360(
      base({
        work: { status: 'ok', items: [sampleWork] },
        staleProjection: true,
      }),
    );
    assert.equal(composed.nextAction.kind, 'recorded_follow_up');
    assert.equal(
      composed.blockers.some((item) => item.code === 'stale_projection'),
      true,
    );
  });

  it('is deterministic and omits commitments and manual facts', () => {
    const input = base({
      timeline: { status: 'ok', items: [samplePartyTimelineEntry] },
      quotes: { status: 'ok', items: [sampleQuote] },
    });
    const left = composeCliente360(input);
    const right = composeCliente360(input);
    assert.deepEqual(left, right);
    assert.deepEqual(left.omittedSignals, ['commitments', 'manual_facts']);
    assert.deepEqual(CLIENTE_360_OMITTED_SIGNALS, ['commitments', 'manual_facts']);
    assert.equal(Object.hasOwn(left, 'commitments'), false);
    assert.equal(Object.hasOwn(left, 'manualFacts'), false);
  });

  it('does not import other lanes or an AI provider', () => {
    const source = readFileSync(new URL('./next-action.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /from ['"][^'"]*reported-fact/);
    assert.doesNotMatch(source, /from ['"][^'"]*data-health/);
    assert.doesNotMatch(source, /from ['"][^'"]*commitment/);
    assert.doesNotMatch(source, /openai|anthropic|generateText|@ai-sdk/i);
  });

  it('answers both staff questions with the same statement', () => {
    const composed = composeCliente360(base());
    assert.equal(composed.now, composed.nextAction.statement);
    assert.ok(composed.why.length > 0);
    assert.equal(CLIENTE_360_COPY.now, '¿Qué hago ahora?');
    assert.equal(CLIENTE_360_COPY.why, '¿Por qué veo esto?');
  });
});

describe('party list location meta', () => {
  it('keeps coordinates and provenance distinct without printing the URL', () => {
    assert.equal(partyListLocationMeta({ hasCoordinates: true }), 'Ubicación disponible');
    assert.equal(
      partyListLocationMeta({ hasCoordinates: true, locationProvenanceUrl: MAPS_URL }),
      'Ubicación disponible',
    );
    assert.equal(
      partyListLocationMeta({ hasCoordinates: false, locationProvenanceUrl: MAPS_URL }),
      'Sin coordenadas',
    );
    assert.equal(partyListLocationMeta({ hasCoordinates: false }), null);
    assert.equal(partyListLocationMeta({ locationProvenanceUrl: MAPS_URL }), null);
    assert.doesNotMatch(
      partyListLocationMeta({ hasCoordinates: false, locationProvenanceUrl: MAPS_URL }) ?? '',
      /https?:/,
    );
  });
});
