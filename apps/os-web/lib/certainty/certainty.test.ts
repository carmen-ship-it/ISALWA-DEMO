import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  ASK_ISALWA_SECTION,
  CERTAINTY_LABEL,
  CERTAINTY_TONE,
  buildAskIsalwaAnswer,
  certaintyLabel,
  certaintyTone,
  formatFreshnessWording,
  freshnessForbidsDesactualizado,
  looksLikeProbabilityLabel,
  mayRequireConfirmation,
  whoToAskView,
} from './index';

const here = dirname(fileURLToPath(import.meta.url));

describe('certainty model', () => {
  it('exposes exactly three states with required Spanish labels and tones', () => {
    assert.equal(CERTAINTY_LABEL.confirmed, 'CONFIRMADO');
    assert.equal(CERTAINTY_LABEL.pending, 'PENDIENTE DE CONFIRMAR');
    assert.equal(CERTAINTY_LABEL.not_recorded, 'NO REGISTRADO');
    assert.equal(CERTAINTY_TONE.confirmed, 'success');
    assert.equal(CERTAINTY_TONE.pending, 'warning');
    assert.equal(CERTAINTY_TONE.not_recorded, 'neutral');
    assert.equal(certaintyLabel('confirmed'), 'CONFIRMADO');
    assert.equal(certaintyTone('pending'), 'warning');
  });

  it('rejects AI probability labels', () => {
    assert.equal(looksLikeProbabilityLabel('87% confianza'), true);
    assert.equal(looksLikeProbabilityLabel('alta confianza'), true);
    assert.equal(looksLikeProbabilityLabel('CONFIRMADO'), false);
  });
});

describe('freshness wording', () => {
  it('formats Actualizado hace / ayer / Última actualización without desactualizado', () => {
    const asOf = new Date('2026-09-16T18:00:00.000Z');
    const hours = formatFreshnessWording({
      updatedAt: '2026-09-16T16:00:00.000Z',
      asOf,
    });
    assert.equal(hours, 'Actualizado hace 2 h');

    const yesterday = formatFreshnessWording({
      updatedAt: '2026-09-15T12:00:00.000Z',
      asOf,
    });
    assert.equal(yesterday, 'Actualizado ayer');

    const absolute = formatFreshnessWording({
      updatedAt: '2026-09-10T14:32:00.000Z',
      asOf,
      preferAbsolute: true,
    });
    assert.match(absolute ?? '', /^Última actualización:/);
    assert.ok(freshnessForbidsDesactualizado(hours!));
    assert.ok(freshnessForbidsDesactualizado(yesterday!));
    assert.ok(freshnessForbidsDesactualizado(absolute!));
  });

  it('shows Puede requerir confirmación only for allowed reasons', () => {
    assert.equal(mayRequireConfirmation('time_sensitive_action'), 'Puede requerir confirmación');
    assert.equal(mayRequireConfirmation('lacks_newer_confirmation'), 'Puede requerir confirmación');
    assert.equal(mayRequireConfirmation('pending_manual_update'), 'Puede requerir confirmación');
    assert.equal(mayRequireConfirmation(null), null);
  });
});

describe('who-to-ask', () => {
  it('shows RESPONSABLE name+team when canonical; never invents from Cargo', () => {
    const assigned = whoToAskView({
      responsible: {
        memberId: 'm1',
        displayName: 'María Pérez',
        teamLabel: 'Producción',
      },
      canRequestUpdate: true,
    });
    assert.equal(assigned.kind, 'assigned');
    if (assigned.kind === 'assigned') {
      assert.equal(assigned.kicker, 'RESPONSABLE');
      assert.equal(assigned.name, 'María Pérez');
      assert.equal(assigned.teamLabel, 'Producción');
      assert.equal(assigned.requestUpdateLabel, 'Solicitar actualización');
    }
  });

  it('shows absent copy and gated Asignar responsable', () => {
    const absent = whoToAskView({ responsible: null, canAssignResponsible: true });
    assert.equal(absent.kind, 'absent');
    if (absent.kind === 'absent') {
      assert.equal(absent.message, 'Aún no hay una persona responsable asignada.');
      assert.equal(absent.assignLabel, 'Asignar responsable');
    }
    const noGate = whoToAskView({ responsible: null, canAssignResponsible: false });
    assert.equal(noGate.kind, 'absent');
    if (noGate.kind === 'absent') {
      assert.equal(noGate.assignLabel, null);
    }
  });
});

describe('Ask ISALWA format', () => {
  it('builds LO CONFIRMADO / PENDIENTE / NO REGISTRADO / RECOMENDACIÓN / A QUIÉN / FUENTES', () => {
    const sections = buildAskIsalwaAnswer({
      confirmed: ['Pedido O-1 existe'],
      pending: ['Fecha de salida aún no confirmada'],
      notRecorded: ['Entrega no registrada'],
      recommendation: 'Solicitar actualización a producción',
      whoToAsk: whoToAskView({
        responsible: { memberId: 'm1', displayName: 'Ana', teamLabel: 'Producción' },
      }),
      sources: [{ label: 'Pedido O-1', href: '/pedidos/o-1' }],
    });
    const titles = sections.map((s) => s.title);
    assert.deepEqual(titles, [
      ASK_ISALWA_SECTION.confirmed,
      ASK_ISALWA_SECTION.pending,
      ASK_ISALWA_SECTION.notRecorded,
      ASK_ISALWA_SECTION.recommendation,
      ASK_ISALWA_SECTION.whoToAsk,
      ASK_ISALWA_SECTION.sources,
    ]);
  });
});

describe('certainty UI wiring', () => {
  it('exports badges and cards for conversation context consumers', () => {
    const badge = readFileSync(join(here, '../../components/certainty/certainty-badge.tsx'), 'utf8');
    const who = readFileSync(join(here, '../../components/certainty/who-to-ask-card.tsx'), 'utf8');
    const ask = readFileSync(join(here, '../../components/certainty/ask-isalwa-answer.tsx'), 'utf8');
    assert.match(badge, /CertaintyBadge/);
    assert.match(badge, /certaintyLabel|certaintyBadgeLabel/);
    assert.match(who, /WHO_TO_ASK_COPY\.assign/);
    assert.match(who, /whoToAskView/);
    assert.doesNotMatch(who, /Cargo/);
    assert.match(ask, /buildAskIsalwaAnswer/);
  });
});
