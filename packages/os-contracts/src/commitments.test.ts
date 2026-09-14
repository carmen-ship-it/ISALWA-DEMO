import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cancelCommitment,
  confirmCommitmentSuggestion,
  createCommitmentSuggestion,
  createEmployeeCommitment,
  commitmentsInOrganization,
  deriveCommitmentState,
  fulfillCommitment,
  isCanonicalCommitment,
  suggestionIsCommitment,
  type CommitmentRecord,
} from './commitments';

const createdAt = '2026-09-13T16:00:00.000Z';
const dueSep14 = '2026-09-14T04:00:00.000Z';
const noonSep13 = new Date('2026-09-13T16:00:00.000Z');
const noonSep14 = new Date('2026-09-14T16:00:00.000Z');
const stillSep14 = new Date('2026-09-15T03:30:00.000Z');
const midnightSep15 = new Date('2026-09-15T04:00:00.000Z');

function openCommitment(overrides: Partial<CommitmentRecord> = {}): CommitmentRecord {
  const created = createEmployeeCommitment({
    id: 'c1',
    organizationId: 'org-a',
    ownerMemberId: 'mem-1',
    createdByMemberId: 'mem-1',
    text: 'Confirmar despacho mañana',
    dueAt: dueSep14,
    partyId: 'party-1',
    createdAt,
    ...overrides,
  });
  assert.equal(created.ok, true);
  if (!created.ok) throw new Error('expected commitment');
  return created.commitment;
}

describe('commitment states', () => {
  it('uses the Bolivia calendar day, not an instant deadline', () => {
    const record = openCommitment();
    assert.equal(deriveCommitmentState(record, noonSep13), 'pending');
    assert.equal(deriveCommitmentState(record, noonSep14), 'due_today');
    assert.equal(deriveCommitmentState(record, stillSep14), 'due_today');
    assert.equal(deriveCommitmentState(record, midnightSep15), 'overdue');
  });

  it('keeps an undated open commitment pending', () => {
    const created = createEmployeeCommitment({
      id: 'c-undated',
      organizationId: 'org-a',
      ownerMemberId: 'mem-1',
      createdByMemberId: 'mem-1',
      text: 'Llamar al cliente',
      dueAt: null,
      createdAt,
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(deriveCommitmentState(created.commitment, midnightSep15), 'pending');
    assert.equal(created.commitment.lifecycle, 'open');
  });

  it('does not turn a fulfilled or cancelled commitment back into overdue', () => {
    const open = openCommitment();
    const fulfilled = fulfillCommitment(open, '2026-09-16T15:00:00.000Z');
    assert.equal(fulfilled.ok, true);
    if (!fulfilled.ok) return;
    assert.equal(deriveCommitmentState(fulfilled.commitment, midnightSep15), 'fulfilled');
    assert.equal(fulfilled.commitment.fulfilledAt, '2026-09-16T15:00:00.000Z');

    const cancelled = cancelCommitment(open, '2026-09-16T15:00:00.000Z');
    assert.equal(cancelled.ok, true);
    if (!cancelled.ok) return;
    assert.equal(deriveCommitmentState(cancelled.commitment, midnightSep15), 'cancelled');
    assert.equal(open.lifecycle, 'open');
  });

  it('does not fulfill a cancelled commitment or cancel a fulfilled one', () => {
    const open = openCommitment();
    const cancelled = cancelCommitment(open, '2026-09-14T15:00:00.000Z');
    assert.equal(cancelled.ok, true);
    if (!cancelled.ok) return;
    const fulfilledAfter = fulfillCommitment(cancelled.commitment, '2026-09-14T16:00:00.000Z');
    assert.deepEqual(fulfilledAfter, { ok: false, reason: 'already_cancelled' });

    const fulfilled = fulfillCommitment(open, '2026-09-14T15:00:00.000Z');
    assert.equal(fulfilled.ok, true);
    if (!fulfilled.ok) return;
    const cancelledAfter = cancelCommitment(fulfilled.commitment, '2026-09-14T16:00:00.000Z');
    assert.deepEqual(cancelledAfter, { ok: false, reason: 'already_fulfilled' });
  });

  it('rejects an empty text and an incomplete subject', () => {
    const empty = createEmployeeCommitment({
      id: 'c2',
      organizationId: 'org-a',
      ownerMemberId: 'mem-1',
      createdByMemberId: 'mem-1',
      text: '   ',
      createdAt,
    });
    assert.deepEqual(empty, { ok: false, reason: 'text_required' });

    const subject = createEmployeeCommitment({
      id: 'c3',
      organizationId: 'org-a',
      ownerMemberId: 'mem-1',
      createdByMemberId: 'mem-1',
      text: 'Enviar cotización',
      relatedSubjectType: 'quote',
      relatedSubjectId: null,
      createdAt,
    });
    assert.deepEqual(subject, { ok: false, reason: 'subject_incomplete' });
  });

  it('does not treat a suggestion as a commitment until a person confirms it', () => {
    const suggested = createCommitmentSuggestion({
      id: 'sug-1',
      organizationId: 'org-a',
      proposedText: 'Posible fecha el viernes',
      proposedDueAt: dueSep14,
      partyId: 'party-1',
      sourceExcerpt: 'te confirmo el viernes',
    });
    assert.equal(suggested.ok, true);
    if (!suggested.ok) return;
    assert.equal(suggestionIsCommitment(suggested.suggestion), false);
    assert.equal(isCanonicalCommitment(suggested.suggestion), false);

    const confirmed = confirmCommitmentSuggestion(suggested.suggestion, {
      id: 'c-confirmed',
      ownerMemberId: 'mem-1',
      createdByMemberId: 'mem-1',
      createdAt,
    });
    assert.equal(confirmed.ok, true);
    if (!confirmed.ok) return;
    assert.equal(confirmed.commitment.canonical, true);
    assert.equal(confirmed.commitment.origin, 'human_confirmed_suggestion');
    assert.equal(confirmed.commitment.provenanceSuggestionId, 'sug-1');
    assert.equal(confirmed.commitment.text, 'Posible fecha el viernes');
    assert.equal(suggested.suggestion.canonical, false);
  });

  it('does not return another organization', () => {
    const own = openCommitment();
    const other = openCommitment();
    const foreign = { ...other, id: 'c-foreign', organizationId: 'org-b' };
    const visible = commitmentsInOrganization([own, foreign], 'org-a');
    assert.deepEqual(visible.map((item) => item.id), ['c1']);
  });
});
