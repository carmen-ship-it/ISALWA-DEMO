import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ElapsedNoticeClock,
  noticeForWaitingConversation,
  noticesForOpenCommitment,
  unclaimedRecipient,
  type ElapsedNoticeRow,
  type ElapsedNoticeStore,
  type OpenCommitmentRow,
  type WaitingConversationRow,
} from './elapsed-notice-clock';
import { CONVERSATION_UNCLAIMED_MS } from '@isalwa/os-contracts';

const NOW = new Date('2026-11-25T16:00:00.000Z');

function commitment(overrides: Partial<OpenCommitmentRow> = {}): OpenCommitmentRow {
  return {
    id: 'c1',
    organizationId: 'org-a',
    ownerMemberId: 'owner-1',
    partyId: 'party-1',
    text: 'Llamar al cliente',
    lifecycle: 'open',
    dueAt: NOW,
    ...overrides,
  };
}

function waiting(overrides: Partial<WaitingConversationRow> = {}): WaitingConversationRow {
  return {
    id: 'cv1',
    organizationId: 'org-a',
    customerId: 'party-1',
    assignedMemberId: 'owner-1',
    attentionState: 'waiting_customer',
    attentionStateChangedAt: new Date('2026-11-23T16:00:00.000Z'),
    nextStepCommitmentId: null,
    summary: 'Esperando respuesta',
    ...overrides,
  };
}

describe('elapsed notice rules', () => {
  it('emits due-today and 60-minute-soon as distinct durable kinds', () => {
    const lateEvening = new Date('2026-11-25T03:30:00.000Z');
    const dueSoon = noticesForOpenCommitment(
      commitment({ dueAt: new Date('2026-11-25T04:00:00.000Z') }),
      lateEvening,
    );
    assert.equal(dueSoon.some((row) => row.kind === 'commitment_due_soon'), true);
    assert.equal(dueSoon.some((row) => row.kind === 'commitment_due'), false);

    const dueToday = noticesForOpenCommitment(commitment({ dueAt: NOW }), NOW);
    assert.equal(dueToday.some((row) => row.kind === 'commitment_due'), true);
  });

  it('labels 48 elapsed hours exactly and skips when a next date exists', () => {
    const ready = noticeForWaitingConversation(waiting(), NOW);
    assert.ok(ready);
    assert.equal(ready.title, '48 horas transcurridas');
    assert.equal(ready.kind, 'follow_up_elapsed');
    assert.equal(
      noticeForWaitingConversation(waiting({ nextStepCommitmentId: 'commit-2' }), NOW),
      null,
    );
    assert.equal(
      noticeForWaitingConversation(
        waiting({ attentionStateChangedAt: new Date('2026-11-23T16:00:01.000Z') }),
        NOW,
      ),
      null,
    );
  });

  it('fires 60-minute due-soon at the exact boundary and not one ms early', () => {
    const dueAt = new Date(NOW.getTime() + 60 * 60 * 1000);
    const atBoundary = noticesForOpenCommitment(commitment({ dueAt }), NOW);
    assert.equal(atBoundary.some((row) => row.kind === 'commitment_due_soon'), true);
    const early = noticesForOpenCommitment(
      commitment({ dueAt: new Date(dueAt.getTime() + 1) }),
      NOW,
    );
    assert.equal(early.some((row) => row.kind === 'commitment_due_soon'), false);
  });

  it('fires 15-minute unclaimed only after the exact elapsed boundary', () => {
    assert.equal(CONVERSATION_UNCLAIMED_MS, 15 * 60 * 1000);
    assert.equal(unclaimedRecipient(null), null);
    assert.equal(unclaimedRecipient('  '), null);
    assert.equal(unclaimedRecipient('mgr-1'), 'mgr-1');
  });
});

describe('ElapsedNoticeClock', () => {
  it('inserts once and is idempotent on the second tick', async () => {
    const inserted: ElapsedNoticeRow[] = [];
    const store: ElapsedNoticeStore = {
      async listOpenCommitments() {
        return [commitment({ dueAt: new Date('2026-11-24T16:00:00.000Z') })];
      },
      async listWaitingCustomerConversations() {
        return [waiting()];
      },
      async listUnclaimedConversations() {
        return [
          waiting({
            id: 'cv-new',
            attentionState: 'new',
            assignedMemberId: null,
            attentionStateChangedAt: new Date('2026-11-25T15:40:00.000Z'),
          }),
        ];
      },
      async listManagerMemberId() {
        return 'manager-1';
      },
      async insertNotices(rows) {
        const fresh = rows.filter((row) => !inserted.some((prior) => prior.dedupKey === row.dedupKey));
        inserted.push(...fresh);
        return fresh.length;
      },
    };
    const clock = new ElapsedNoticeClock(store);
    const first = await clock.runOnce(NOW);
    assert.ok(first.inserted >= 3);
    const second = await clock.runOnce(NOW);
    assert.equal(second.inserted, 0);
    assert.equal(inserted.filter((row) => row.kind === 'commitment_overdue').length, 1);
    assert.equal(inserted.filter((row) => row.kind === 'follow_up_elapsed').length, 1);
    assert.equal(inserted.filter((row) => row.kind === 'conversation_unclaimed').length, 1);
    assert.equal(inserted.filter((row) => row.recipientMemberId === 'manager-1').length, 1);
  });

  it('does not invent an escalation recipient', async () => {
    const store: ElapsedNoticeStore = {
      async listOpenCommitments() {
        return [];
      },
      async listWaitingCustomerConversations() {
        return [];
      },
      async listUnclaimedConversations() {
        return [
          waiting({
            attentionState: 'new',
            assignedMemberId: null,
            attentionStateChangedAt: new Date('2026-11-25T15:40:00.000Z'),
          }),
        ];
      },
      async listManagerMemberId() {
        return null;
      },
      async insertNotices() {
        throw new Error('must not insert');
      },
    };
    const result = await new ElapsedNoticeClock(store).runOnce(NOW);
    assert.equal(result.inserted, 0);
  });
});
