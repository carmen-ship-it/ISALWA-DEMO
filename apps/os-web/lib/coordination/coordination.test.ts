import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  COORDINATION_DECISION_CAPABILITY,
  emptyCoordinationLedger,
  recordCoordinationDecision,
} from '@isalwa/os-contracts';
import {
  COORDINATION_RECORD_BUTTON,
  buildCoordinationPageModel,
  canRecordCoordinationDecision,
  coordinationCapabilitiesForMember,
} from './page-model';
import { COORDINACION_NAV_REQUEST } from '../navigation/requests/coordinacion';

const occurredAt = '2026-09-16T15:00:00.000Z';
const secretTitle = 'Decisión reservada de planta norte';

describe('coordination page model', () => {
  it('says there is nothing that needs a committee decision when input is empty', () => {
    const model = buildCoordinationPageModel({
      session: { organizationId: 'org-a', actorLabel: 'Ana', grantedCapabilities: [] },
    });
    assert.equal(model.committee.items.length, 0);
    assert.equal(model.committee.meetingRequired, false);
    assert.equal(model.emptyTitle, 'No hay nada que necesite una decisión de comité.');
    assert.equal(model.openDecisions.length, 0);
    assert.equal(COORDINATION_RECORD_BUTTON, 'Registrar decisión');
  });

  it('does not infer the capability from a job title', () => {
    const granted = coordinationCapabilitiesForMember({
      cargo: 'Auxiliar',
      title: 'Auxiliar',
      grantedCapabilities: ['production', 'finance', 'warehouse'],
    });
    assert.deepEqual(granted, []);
    assert.equal(
      canRecordCoordinationDecision({
        organizationId: 'org-a',
        cargo: 'Auxiliar',
        title: 'Coordinador',
        grantedCapabilities: granted,
      }),
      false,
    );
    assert.equal(
      canRecordCoordinationDecision({
        organizationId: 'org-a',
        cargo: 'Auxiliar',
        title: 'Auxiliar',
        grantedCapabilities: [COORDINATION_DECISION_CAPABILITY],
      }),
      true,
    );
    assert.equal(COORDINACION_NAV_REQUEST.capability, COORDINATION_DECISION_CAPABILITY);
    assert.equal(COORDINACION_NAV_REQUEST.infersCapabilityFromTitle, false);
  });

  it('keeps this tenant empty when another tenant has open decisions', () => {
    const foreign = recordCoordinationDecision({
      session: {
        organizationId: 'org-b',
        actorMemberId: 'member-b',
        actorLabel: 'Norte',
        grantedCapabilities: [COORDINATION_DECISION_CAPABILITY],
      },
      ledger: emptyCoordinationLedger(),
      id: 'dec-secret',
      decision: secretTitle,
      occurredAt,
      organizationId: 'org-b',
    });
    assert.equal(foreign.ok, true);
    if (!foreign.ok) return;

    const model = buildCoordinationPageModel({
      session: {
        organizationId: 'org-a',
        actorLabel: 'Ana',
        cargo: 'Auxiliar',
        title: 'Auxiliar',
        grantedCapabilities: [COORDINATION_DECISION_CAPABILITY],
      },
      matters: [
        {
          id: 'foreign-matter',
          organizationId: 'org-b',
          triggers: ['delivery_blocked'],
          cliente: 'Cliente secreto',
          problema: secretTitle,
        },
      ],
      decisions: foreign.value.ledger.decisions,
    });
    assert.equal(model.committee.items.length, 0);
    assert.equal(model.openDecisions.length, 0);
    assert.equal(model.ledger.decisions.length, 0);
    assert.equal(JSON.stringify(model).includes(secretTitle), false);
    assert.equal(JSON.stringify(model).includes('Cliente secreto'), false);
  });

  it('does not show another tenant title when the session organization is missing', () => {
    const foreign = recordCoordinationDecision({
      session: {
        organizationId: 'org-b',
        actorLabel: 'Norte',
        grantedCapabilities: [COORDINATION_DECISION_CAPABILITY],
      },
      ledger: emptyCoordinationLedger(),
      id: 'dec-secret',
      decision: secretTitle,
      occurredAt,
    });
    assert.equal(foreign.ok, true);
    if (!foreign.ok) return;

    const model = buildCoordinationPageModel({
      session: { organizationId: '   ', title: 'Auxiliar', grantedCapabilities: [COORDINATION_DECISION_CAPABILITY] },
      decisions: foreign.value.ledger.decisions,
    });
    assert.equal(model.organizationId, null);
    assert.equal(model.canRecord, false);
    assert.equal(model.committee.items.length, 0);
    assert.equal(JSON.stringify(model).includes(secretTitle), false);
  });
});

describe('coordination page loader', () => {
  it('loads hosted scopes through loadMemberCapabilities, not the dev session alone', () => {
    const source = readFileSync(new URL('./load.ts', import.meta.url), 'utf8');
    assert.match(source, /loadMemberCapabilities/);
    assert.match(source, /grantedCapabilities:\s*context\.grantedScopes/);
    assert.doesNotMatch(source, /devSession\?\.organizationId/);
    assert.doesNotMatch(source, /coordinationGrantedCapabilitiesForSession/);
    assert.doesNotMatch(source, /getAuthenticatedSession/);
    assert.doesNotMatch(source, /getMember\(/);
  });
});
