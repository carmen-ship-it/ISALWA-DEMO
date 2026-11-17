import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CLIENTE360_UX_COPY } from '@/lib/cliente/copy';
import {
  buildCliente360StatusHeader,
  conversationDeepLink,
  countOpenIssues,
  pickLatestAttention,
  type AttentionSummary,
} from '@/lib/cliente/status-header';
import type { Cliente360Composition } from '@/lib/party/next-action';
import { CLIENTE_360_COPY } from '@/lib/party/next-action';
import { OWNER_ABSENT_LABEL } from '@/lib/party/customer-self-service';

function baseNextAction(
  overrides: Partial<Cliente360Composition['nextAction']> = {},
): Cliente360Composition['nextAction'] {
  return {
    kind: 'insufficient',
    statement: CLIENTE_360_COPY.insufficient,
    href: null,
    hrefLabel: null,
    dueText: null,
    overdue: false,
    workItemId: null,
    ...overrides,
  };
}

function baseOwner(
  overrides: Partial<Cliente360Composition['owner']> = {},
): Cliente360Composition['owner'] {
  return {
    assigned: false,
    label: OWNER_ABSENT_LABEL,
    memberId: null,
    note: CLIENTE_360_COPY.ownerAbsent,
    ...overrides,
  };
}

function composition(input: {
  nextAction?: Partial<Cliente360Composition['nextAction']>;
  owner?: Partial<Cliente360Composition['owner']>;
} = {}): Cliente360Composition {
  const nextAction = baseNextAction(input.nextAction);
  const owner = baseOwner(input.owner);
  return {
    owner,
    primaryContact: {
      id: null,
      name: null,
      title: null,
      phone: null,
      hasPhone: false,
      source: 'none',
      summary: CLIENTE_360_COPY.noContact,
    },
    location: {
      state: 'none',
      summary: CLIENTE_360_COPY.noCoordinates,
      coordinates: null,
      address: null,
      provenance: null,
    },
    latestActivity: {
      state: 'empty',
      label: null,
      summary: CLIENTE_360_COPY.noActivity,
      occurredAt: null,
      occurredLabel: null,
      href: null,
    },
    relationship: { roleSummary: 'Sin relación activa', accountLabel: null, summary: 'Sin relación activa.' },
    blockers: [],
    blockersSummary: CLIENTE_360_COPY.noBlockers,
    nextAction,
    now: nextAction.statement,
    why: [],
    omittedSignals: ['commitments', 'manual_facts'],
  };
}

function attention(overrides: Partial<AttentionSummary> = {}): AttentionSummary {
  return {
    id: 'attn-1',
    occurredAt: '2026-11-16T15:00:00.000Z',
    reason: 'Consulta de plazo',
    summary: 'Llamada de seguimiento',
    ...overrides,
  };
}

describe('Cliente 360 status header', () => {
  it('shows V2 absent copy when next step, owner, attention and issues are empty', () => {
    const model = buildCliente360StatusHeader({
      partyId: 'pty-1',
      composition: composition(),
      attention: { status: 'ok', data: { items: [] } },
      issues: { status: 'ok', data: { items: [] } },
    });

    assert.equal(model.nextStep.state, 'absent');
    assert.equal(model.nextStep.text, CLIENTE360_UX_COPY.noNextAction);
    assert.equal(model.owner.state, 'absent');
    assert.equal(model.owner.text, OWNER_ABSENT_LABEL);
    assert.equal(model.lastAttention.state, 'absent');
    assert.equal(model.lastAttention.text, CLIENTE360_UX_COPY.noLastAttention);
    assert.equal(model.openIssues.state, 'absent');
    assert.equal(model.openIssues.text, CLIENTE360_UX_COPY.noOpenIssues);
    assert.equal(model.openIssues.count, 0);
  });

  it('does not treat failed attention or issues reads as absence', () => {
    const model = buildCliente360StatusHeader({
      partyId: 'pty-1',
      composition: composition({
        nextAction: {
          kind: 'unreadable',
          statement: CLIENTE_360_COPY.unreadable,
        },
      }),
      attention: { status: 'error', message: 'down' },
      issues: { status: 'unavailable' },
    });

    assert.equal(model.nextStep.state, 'unavailable');
    assert.equal(model.nextStep.text, CLIENTE360_UX_COPY.nextActionUnavailable);
    assert.notEqual(model.nextStep.text, CLIENTE360_UX_COPY.noNextAction);
    assert.equal(model.lastAttention.state, 'unavailable');
    assert.equal(model.lastAttention.text, CLIENTE360_UX_COPY.lastAttentionUnavailable);
    assert.notEqual(model.lastAttention.text, CLIENTE360_UX_COPY.noLastAttention);
    assert.equal(model.openIssues.state, 'unavailable');
    assert.equal(model.openIssues.count, null);
    assert.notEqual(model.openIssues.text, CLIENTE360_UX_COPY.noOpenIssues);
  });

  it('surfaces recorded next step, owner, latest attention and open issue count with links', () => {
    const latest = attention({
      id: 'attn-new',
      occurredAt: '2026-11-16T18:00:00.000Z',
      reason: 'Visita en planta',
    });
    const older = attention({
      id: 'attn-old',
      occurredAt: '2026-11-15T12:00:00.000Z',
      reason: 'Llamada previa',
    });
    const model = buildCliente360StatusHeader({
      partyId: 'pty-1',
      composition: composition({
        owner: {
          assigned: true,
          label: 'Ana Rojas',
          memberId: 'mem-ana',
          note: null,
        },
        nextAction: {
          kind: 'recorded_follow_up',
          statement: 'Llamar mañana',
          href: '/trabajo/w-9',
          hrefLabel: 'Ver seguimiento',
          dueText: 'Vence mañana',
          overdue: false,
          workItemId: 'w-9',
        },
      }),
      attention: { status: 'ok', data: { items: [older, latest] } },
      issues: {
        status: 'ok',
        data: { items: [{ status: 'open' }, { status: 'resolved' }, { status: 'open' }] },
      },
    });

    assert.equal(model.nextStep.state, 'present');
    assert.equal(model.nextStep.text, 'Llamar mañana');
    assert.equal(model.nextStep.href, '/trabajo/w-9');
    assert.equal(model.owner.state, 'present');
    assert.equal(model.owner.text, 'Ana Rojas');
    assert.equal(model.lastAttention.state, 'present');
    assert.match(model.lastAttention.text, /Visita en planta/);
    assert.equal(model.lastAttention.href, conversationDeepLink('attn-new'));
    assert.equal(model.openIssues.state, 'present');
    assert.equal(model.openIssues.count, 2);
    assert.equal(model.openIssues.href, '/clientes/pty-1?tab=trabajo');
  });

  it('picks the newest attention with a stable id tie-break', () => {
    const a = attention({ id: 'b', occurredAt: '2026-11-16T12:00:00.000Z' });
    const b = attention({ id: 'a', occurredAt: '2026-11-16T12:00:00.000Z' });
    assert.equal(pickLatestAttention([a, b])?.id, 'b');
  });

  it('counts only non-closed issues', () => {
    assert.equal(
      countOpenIssues([{ status: 'open' }, { status: 'closed' }, { status: 'resolved' }, { status: 'triaged' }]),
      2,
    );
  });
});
