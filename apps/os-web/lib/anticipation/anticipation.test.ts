import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dueTimingBand, dueTimingLabel, isDueSoonBand } from './due-timing';
import { buildPatternInsight, patternInsightEligible, quoteSentWithoutFollowUpInsight } from './pattern-insights';
describe('anticipation due timing', () => {
  const now = Date.parse('2026-09-16T18:00:00.000Z');

  it('labels due-soon within 24h and imminent within 2h from dueAt', () => {
    assert.equal(dueTimingBand('2026-09-16T19:00:00.000Z', now), 'due_imminent');
    assert.equal(dueTimingLabel('due_imminent'), 'Vence en breve');
    assert.equal(dueTimingBand('2026-09-17T10:00:00.000Z', now), 'due_soon');
    assert.equal(isDueSoonBand('due_soon'), true);
    assert.equal(dueTimingBand('2026-09-15T10:00:00.000Z', now), 'past_due');
    assert.equal(dueTimingLabel('past_due'), 'Vencido');
  });
});

describe('pattern insights', () => {
  it('requires minimum counts and avoids judgment language', () => {
    assert.equal(patternInsightEligible('quotes_without_follow_up', 2), false);
    const card = buildPatternInsight({
      kind: 'overdue_work',
      count: 3,
      href: '/trabajo',
    });
    assert.ok(card);
    assert.match(card!.message, /3 seguimientos vencidos/);
    assert.doesNotMatch(card!.message, /mal|peor|deficiente/i);
    const quotes = quoteSentWithoutFollowUpInsight({ sentQuotesWithoutFollowUp: 3, quotesHref: '/cotizaciones' });
    assert.ok(quotes);
  });
});
