import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ATTENTION_STATES,
  ATTENTION_STATE_LABELS,
  AddInternalNoteSchema,
  INTERNAL_NOTE_LABEL,
  INTERNAL_NOTE_MAX_LENGTH,
  allowedAttentionTargets,
  assertInternalNoteShape,
  attentionStateAfterInbound,
  attentionStateAfterTake,
  checkAttentionTransition,
  humanActionPausesAutomation,
  isAttentionState,
  recordManualCustomerConversation,
  TransitionAttentionStateSchema,
  type AttentionState,
} from './index';

describe('attention states (Batch 5B)', () => {
  it('uses exactly the approved mapping and Spanish labels', () => {
    assert.deepEqual([...ATTENTION_STATES], ['new', 'in_attention', 'waiting_customer', 'waiting_team', 'resolved']);
    assert.deepEqual(
      ATTENTION_STATES.map((state) => ATTENTION_STATE_LABELS[state]),
      ['Nueva', 'En atención', 'Esperando al cliente', 'Esperando al equipo', 'Resuelta'],
    );
    assert.equal(isAttentionState('in_attention'), true);
    assert.equal(isAttentionState('ai_replying'), false);
    assert.equal(isAttentionState(null), false);
  });

  it('a new record starts Nueva, unassigned, with no automation pause and no AI state; a request cannot set them', () => {
    const admitted = recordManualCustomerConversation({
      id: 'c1',
      organizationId: 'org',
      customerId: 'p1',
      customerLabel: 'Cliente',
      channel: 'call',
      occurredAt: '2026-11-16T14:00:00.000Z',
      enteredByLabel: 'Ana',
      reason: 'Consulta',
      summary: 'Resumen',
      ...({ attentionState: 'resolved', automationPausedAt: '2026-11-16T14:00:00.000Z', aiState: 'active' } as object),
    });
    assert.equal(admitted.ok, true);
    if (!admitted.ok) return;
    assert.equal(admitted.record.attentionState, 'new');
    assert.equal(admitted.record.attentionStateChangedAt, null);
    assert.equal(admitted.record.automationPausedAt, null);
    assert.equal(admitted.record.aiState, null);
    assert.equal(admitted.record.assignedMemberId, null);
  });

  it('never goes back to Nueva by hand and never claims attention nobody gives', () => {
    for (const from of ATTENTION_STATES) {
      assert.notEqual(checkAttentionTransition({ from, to: 'new', held: true }).ok, true, `${from} -> new`);
    }
    assert.deepEqual(checkAttentionTransition({ from: 'new', to: 'in_attention', held: false }), {
      ok: false,
      reason: 'holder_required',
    });
    assert.deepEqual(checkAttentionTransition({ from: 'new', to: 'in_attention', held: true }), { ok: true });
    assert.deepEqual(checkAttentionTransition({ from: 'resolved', to: 'in_attention', held: false }), {
      ok: false,
      reason: 'holder_required',
    });
    assert.deepEqual(checkAttentionTransition({ from: 'resolved', to: 'waiting_team', held: true }), {
      ok: false,
      reason: 'transition_not_allowed',
    });
    assert.deepEqual(checkAttentionTransition({ from: 'waiting_team', to: 'waiting_team', held: true }), {
      ok: false,
      reason: 'same_state',
    });
  });

  it('offers only transitions the command accepts', () => {
    const everyState = (held: boolean) =>
      ATTENTION_STATES.map((from) => [from, allowedAttentionTargets({ from, held })] as const);
    for (const held of [true, false]) {
      for (const [from, targets] of everyState(held)) {
        for (const to of ATTENTION_STATES) {
          assert.equal(
            targets.includes(to),
            checkAttentionTransition({ from, to, held }).ok,
            `${from} -> ${to} held=${held}`,
          );
        }
      }
    }
    assert.deepEqual(allowedAttentionTargets({ from: 'new', held: false }), [
      'waiting_customer',
      'waiting_team',
      'resolved',
    ]);
    assert.deepEqual(allowedAttentionTargets({ from: 'resolved', held: true }), ['in_attention']);
    assert.deepEqual(allowedAttentionTargets({ from: 'resolved', held: false }), []);
  });

  it('taking a conversation starts attention only from Nueva or Esperando al equipo', () => {
    const expected: Record<AttentionState, AttentionState> = {
      new: 'in_attention',
      waiting_team: 'in_attention',
      in_attention: 'in_attention',
      waiting_customer: 'waiting_customer',
      resolved: 'resolved',
    };
    for (const state of ATTENTION_STATES) assert.equal(attentionStateAfterTake(state), expected[state]);
  });

  it('reopens on a new inbound message: the team owes a reply, unassigned returns to the queue', () => {
    assert.deepEqual(attentionStateAfterInbound({ state: 'resolved', held: false }), { state: 'new', reopened: true });
    assert.deepEqual(attentionStateAfterInbound({ state: 'resolved', held: true }), { state: 'in_attention', reopened: true });
    assert.deepEqual(attentionStateAfterInbound({ state: 'waiting_customer', held: true }), { state: 'in_attention', reopened: true });
    assert.deepEqual(attentionStateAfterInbound({ state: 'waiting_customer', held: false }), { state: 'new', reopened: true });
    for (const state of ['new', 'in_attention', 'waiting_team'] as const) {
      assert.deepEqual(attentionStateAfterInbound({ state, held: true }), { state, reopened: false });
    }
  });

  it('a human action pauses automation; an inbound message does not resume or pause it', () => {
    assert.equal(humanActionPausesAutomation('take'), true);
    assert.equal(humanActionPausesAutomation('manual'), true);
    assert.equal(humanActionPausesAutomation('inbound'), false);
  });

  it('validates the state request body', () => {
    assert.equal(TransitionAttentionStateSchema.safeParse({ to: 'resolved' }).success, true);
    assert.equal(TransitionAttentionStateSchema.safeParse({ to: 'ai_replying' }).success, false);
    assert.equal(TransitionAttentionStateSchema.safeParse({}).success, false);
  });
});

describe('internal notes ("Solo equipo", Batch 5B)', () => {
  it('requires text within the limit and a request key', () => {
    assert.equal(INTERNAL_NOTE_LABEL, 'Solo equipo');
    assert.equal(AddInternalNoteSchema.safeParse({ body: ' Nota ', requestKey: 'abcdefgh' }).success, true);
    assert.equal(AddInternalNoteSchema.parse({ body: ' Nota ', requestKey: 'abcdefgh' }).body, 'Nota');
    for (const bad of [
      { body: '   ', requestKey: 'abcdefgh' },
      { body: 'x'.repeat(INTERNAL_NOTE_MAX_LENGTH + 1), requestKey: 'abcdefgh' },
      { body: 'Nota', requestKey: 'corta' },
      { body: 'Nota' },
    ]) {
      assert.equal(AddInternalNoteSchema.safeParse(bad).success, false);
    }
  });

  it('a note shape cannot carry a channel, a direction, a provider id or a delivery', () => {
    assert.doesNotThrow(() => assertInternalNoteShape({ id: 'n', body: 'x', visibility: 'team_only' }));
    for (const key of ['channel', 'direction', 'provider_message_id', 'delivered_at', 'phone', 'sent_at']) {
      assert.throws(() => assertInternalNoteShape({ visibility: 'team_only', [key]: 'x' }));
    }
    assert.throws(() => assertInternalNoteShape({ visibility: 'customer' }));
  });

  it('the migration keeps notes append-only and team-only, with no outbound column', () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        '../os-database/prisma/migrations/20261024000000_os_conversation_attention_state_notes_b5b/migration.sql',
      ),
      'utf8',
    );
    const notes = sql.slice(sql.indexOf('CREATE TABLE os_customer_conversation_notes'));
    assert.match(notes, /CHECK \(visibility = 'team_only'\)/);
    assert.match(notes, /CONVERSATION_NOTE_APPEND_ONLY/);
    assert.doesNotMatch(
      notes.slice(0, notes.indexOf('CREATE UNIQUE INDEX')),
      /channel|direction|provider|phone|delivered|sent_at/,
    );
    assert.match(sql, /attention_state IN \('new', 'in_attention', 'waiting_customer', 'waiting_team', 'resolved'\)/);
    assert.match(sql, /attention_state <> 'in_attention' OR assigned_member_id IS NOT NULL/);
    assert.match(sql, /CONVERSATION_STATE_CHANGE_APPEND_ONLY/);
    assert.doesNotMatch(sql, /owner_member_id|os_commercial_accounts|ai_state/);
  });
});
