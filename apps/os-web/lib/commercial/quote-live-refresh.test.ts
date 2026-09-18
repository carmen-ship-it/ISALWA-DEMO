import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { QuoteDetailReadModel, QuoteLineReadModel } from '@isalwa/os-contracts';
import { applyAddedLine, applySubmitted, mergeServerQuote } from './quote-live-refresh';

function line(overrides: Partial<QuoteLineReadModel> = {}): QuoteLineReadModel {
  return {
    quoteLineId: 'ql-1',
    quoteId: 'q-1',
    lineNumber: 1,
    description: 'Inodoro Capri',
    quantity: 2,
    unitLabel: 'pza',
    unitPriceCentavos: '42000',
    discountCentavos: '0',
    lineTotalCentavos: '84000',
    productRef: null,
    ...overrides,
  };
}

function quote(overrides: Partial<QuoteDetailReadModel> = {}): QuoteDetailReadModel {
  return {
    quoteId: 'q-1',
    organizationId: 'org-1',
    partyId: 'party-1',
    commercialAccountId: null,
    opportunityId: null,
    ownerMemberId: 'member-1',
    quoteNumber: 'Q-000012',
    status: 'draft',
    currency: 'BOB',
    subtotalCentavos: '0',
    headerDiscountCentavos: '0',
    totalCentavos: '0',
    revisionNumber: 1,
    notes: null,
    submittedAt: null,
    cancelledAt: null,
    createdAt: '2026-09-18T12:00:00.000Z',
    lines: [],
    ...overrides,
  };
}

const overlayLine = line({
  quoteLineId: 'local:inodoro',
  description: 'Inodoro Capri',
  quantity: 2,
  unitPriceCentavos: '42000',
});

const storedLine = line({
  quoteLineId: 'ql-real',
  description: 'Inodoro Capri',
  quantity: 2,
  unitPriceCentavos: '42000',
  lineTotalCentavos: '84000',
});

describe('quote live refresh', () => {
  it('makes an added line visible before a stale server quote arrives', () => {
    const draft = quote();
    const visible = applyAddedLine(draft, overlayLine);
    assert.equal(draft.lines.length, 0);
    assert.equal(visible.lines.length, 1);
    assert.equal(visible.lines[0]?.description, 'Inodoro Capri');
    assert.equal(visible.lines[0]?.quantity, 2);
    assert.equal(visible.lines[0]?.unitPriceCentavos, '42000');
    const again = applyAddedLine(visible, { ...overlayLine, quoteLineId: 'local:again' });
    assert.equal(again.lines.length, 1);
  });

  it('does not let a stale server quote remove that line', () => {
    const visible = applyAddedLine(quote(), overlayLine);
    const stale = quote();
    const merged = mergeServerQuote(visible, stale);
    assert.equal(merged, visible);
    assert.equal(merged.lines.length, 1);
    assert.equal(merged.lines[0]?.description, 'Inodoro Capri');
  });

  it('replaces the overlay with a fresher server quote without duplicating the line', () => {
    const visible = applyAddedLine(quote(), overlayLine);
    const fresher = quote({ lines: [storedLine], totalCentavos: '84000' });
    const merged = mergeServerQuote(visible, fresher);
    assert.equal(merged, fresher);
    assert.equal(merged.lines.length, 1);
    assert.equal(merged.lines[0]?.quoteLineId, 'ql-real');
  });

  it('sets status to submitted immediately on Enviar without inventing other fields', () => {
    const draft = quote({ notes: 'obra norte', totalCentavos: '84000' });
    const sent = applySubmitted(draft);
    assert.equal(sent.status, 'submitted');
    assert.equal(sent.submittedAt, null);
    assert.equal(sent.notes, 'obra norte');
    assert.equal(sent.totalCentavos, '84000');
    assert.equal(sent.cancelledAt, null);
    assert.deepEqual(sent.lines, draft.lines);
    assert.equal(applySubmitted(sent), sent);
  });

  it('does not let a stale draft server quote revert submitted', () => {
    const sent = applySubmitted(quote());
    const stale = quote({ status: 'draft' });
    const merged = mergeServerQuote(sent, stale);
    assert.equal(merged, sent);
    assert.equal(merged.status, 'submitted');
  });

  it('lets a fresher submitted server quote win', () => {
    const sent = applySubmitted(quote());
    const fresher = quote({
      status: 'submitted',
      submittedAt: '2026-09-18T18:00:00.000Z',
    });
    const merged = mergeServerQuote(sent, fresher);
    assert.equal(merged, fresher);
    assert.equal(merged.status, 'submitted');
    assert.equal(merged.submittedAt, '2026-09-18T18:00:00.000Z');
  });

  it('keeps a reload-equivalent server quote that already has the line and submitted status', () => {
    const local = applySubmitted(applyAddedLine(quote(), overlayLine));
    const reloaded = quote({
      status: 'submitted',
      submittedAt: '2026-09-18T18:05:00.000Z',
      lines: [storedLine],
      subtotalCentavos: '84000',
      totalCentavos: '84000',
    });
    const merged = mergeServerQuote(local, reloaded);
    assert.equal(merged, reloaded);
    assert.equal(merged.status, 'submitted');
    assert.equal(merged.lines.length, 1);
    assert.equal(merged.lines[0]?.quoteLineId, 'ql-real');
    assert.equal(merged.submittedAt, '2026-09-18T18:05:00.000Z');
  });
});
