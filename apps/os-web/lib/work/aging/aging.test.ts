import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type { QuoteSummaryReadModel } from '@isalwa/os-contracts';
import { sampleQuote } from '@/lib/commercial/fixtures';
import {
  deriveAgingFacts,
  deriveApprovalAgingFact,
  deriveCommitmentFact,
  deriveQuoteElapsedFact,
  deriveWorkDueFact,
  disappearedAgingKeys,
  isDueToday,
  supplementalAgingGroups,
} from '@/lib/work/aging';
import type { ApprovalAgingSource, CommitmentAgingRecord } from '@/lib/work/aging/types';
import { approvalAttention, sampleAttention } from '@/lib/work/fixtures';

const NOON = new Date('2026-09-14T16:00:00.000Z');

const FORBIDDEN_POLICY =
  /due soon|dueSoon|stale opportunity|seven[- ]day|agingDays|\bSLA\b|notification|prisma|executive-lens|reported-fact|conversation-evidence/i;

function quote(overrides: Partial<QuoteSummaryReadModel> = {}): QuoteSummaryReadModel {
  return { ...sampleQuote, ...overrides };
}

function approval(overrides: Partial<ApprovalAgingSource> = {}): ApprovalAgingSource {
  return {
    approvalRequestId: 'appr-1',
    status: 'pending',
    requestedAt: '2026-09-14T14:00:00.000Z',
    subject: 'Aprobación de entrega',
    ...overrides,
  };
}

function commitment(overrides: Partial<CommitmentAgingRecord> = {}): CommitmentAgingRecord {
  return {
    commitmentId: 'c-1',
    label: 'Llamar al cliente',
    dueAt: '2026-09-14T18:00:00.000Z',
    resolvedAt: null,
    ...overrides,
  };
}

describe('due today uses the Bolivia calendar day', () => {
  const asOf = new Date('2026-09-14T15:00:00.000Z');

  it('keeps a later instant on the same day as due today', () => {
    const fact = deriveWorkDueFact(
      {
        workItemId: 'work-1',
        title: 'Confirmar entrega',
        status: 'open',
        dueAt: '2026-09-14T18:00:00.000Z',
      },
      asOf,
    );
    assert.equal(fact?.kind, 'due_today');
    assert.equal(fact?.label, 'Vence hoy');
    assert.equal(fact?.key, 'work:due-today:work-1');
    assert.equal('attentionType' in (fact ?? {}), false);
    assert.equal(isDueToday('2026-09-14T15:00:00.000Z', asOf), true);
  });

  it('does not use the UTC date when Bolivia is still on the previous day', () => {
    const clock = new Date('2026-09-15T02:00:00.000Z');
    assert.equal(isDueToday('2026-09-15T03:00:00.000Z', clock), true);
    assert.equal(isDueToday('2026-09-15T05:00:00.000Z', clock), false);
    assert.equal(
      deriveWorkDueFact(
        {
          workItemId: 'work-utc',
          title: 'Entrega',
          status: 'open',
          dueAt: '2026-09-15T05:00:00.000Z',
        },
        clock,
      ),
      null,
    );
  });

  it('does not call a past instant today, and does not open an overdue work row', () => {
    const fact = deriveWorkDueFact(
      {
        workItemId: 'work-1',
        title: 'Confirmar entrega',
        status: 'open',
        dueAt: '2026-09-14T14:00:00.000Z',
      },
      asOf,
    );
    assert.equal(fact?.kind, 'elapsed_due');
    assert.equal(fact?.key, 'work:elapsed:work-1');
    assert.notEqual(fact?.key.startsWith('work:overdue:'), true);
    assert.match(fact?.label ?? '', /^Venció: /);
    assert.match(fact?.label ?? '', /1 h$/);
    assert.equal('attentionType' in (fact ?? {}), false);
  });

  it('drops the due-today fact when the work is no longer open', () => {
    const open = deriveAgingFacts({
      work: [
        {
          workItemId: 'work-1',
          title: 'Confirmar entrega',
          status: 'open',
          dueAt: '2026-09-14T18:00:00.000Z',
        },
      ],
      asOf,
    });
    const completed = deriveAgingFacts({
      work: [
        {
          workItemId: 'work-1',
          title: 'Confirmar entrega',
          status: 'completed',
          dueAt: '2026-09-14T18:00:00.000Z',
        },
      ],
      asOf,
    });
    assert.deepEqual(disappearedAgingKeys(open, completed), ['work:due-today:work-1']);
    assert.equal(completed.length, 0);
  });
});

describe('approval and quote elapsed facts', () => {
  it('states how long a pending approval has waited, then drops it when decided', () => {
    const pending = deriveApprovalAgingFact(approval(), NOON);
    assert.equal(pending?.label, 'Pendiente, hace 2 h');
    assert.equal(pending?.key, 'approval:approver:appr-1');
    assert.equal(deriveApprovalAgingFact(approval({ requestedAt: null }), NOON), null);
    assert.equal(deriveApprovalAgingFact(approval({ status: 'approved' }), NOON), null);
    assert.deepEqual(
      disappearedAgingKeys(
        [pending!],
        deriveAgingFacts({ approvals: [approval({ status: 'approved' })], asOf: NOON }),
      ),
      ['approval:approver:appr-1'],
    );
  });

  it('states submission age without a cutoff, and drops it when the quote is no longer submitted', () => {
    const submitted = deriveQuoteElapsedFact(
      quote({ submittedAt: '2026-09-11T16:00:00.000Z' }),
      NOON,
    );
    assert.equal(submitted?.label, 'Enviada, hace 3 días. No es un plazo incumplido.');
    assert.equal(submitted?.key, 'quote:submitted:quote-1');
    assert.equal(submitted?.href, '/clientes/party-1/cotizaciones/quote-1');

    const old = deriveQuoteElapsedFact(
      quote({ quoteId: 'quote-old', submittedAt: '2026-08-05T16:00:00.000Z' }),
      NOON,
    );
    assert.match(old?.label ?? '', /^Enviada, hace \d+ días\. No es un plazo incumplido\.$/);

    assert.equal(deriveQuoteElapsedFact(quote({ status: 'draft', submittedAt: null }), NOON), null);
    assert.equal(
      deriveQuoteElapsedFact(quote({ status: 'submitted', submittedAt: null }), NOON),
      null,
    );
    assert.equal(deriveQuoteElapsedFact(quote({ status: 'accepted' }), NOON), null);
    assert.equal(deriveQuoteElapsedFact(quote({ status: 'cancelled' }), NOON), null);
    assert.deepEqual(
      disappearedAgingKeys(
        [submitted!],
        deriveAgingFacts({
          quotes: [quote({ status: 'accepted', submittedAt: '2026-09-11T16:00:00.000Z' })],
          asOf: NOON,
        }),
      ),
      ['quote:submitted:quote-1'],
    );
  });
});

describe('commitment adapter', () => {
  it('reads already-loaded records and drops them when resolved', () => {
    const asOf = new Date('2026-09-14T15:00:00.000Z');
    const open = deriveAgingFacts({
      commitments: { list: () => [commitment()] },
      asOf,
    });
    assert.equal(open[0]?.key, 'commitment:due-today:c-1');
    assert.equal(open[0]?.label, 'Vence hoy');

    const resolved = deriveAgingFacts({
      commitments: { list: () => [commitment({ resolvedAt: '2026-09-14T15:30:00.000Z' })] },
      asOf,
    });
    assert.deepEqual(disappearedAgingKeys(open, resolved), ['commitment:due-today:c-1']);
    assert.equal(deriveCommitmentFact(commitment({ dueAt: null }), asOf), null);
    assert.equal(deriveAgingFacts({ commitments: { list: () => [] }, asOf }).length, 0);
    assert.equal(deriveAgingFacts({ asOf }).length, 0);
  });

  it('replaces due today with an elapsed fact the next day, without a new owner', () => {
    const today = new Date('2026-09-14T15:00:00.000Z');
    const tomorrow = new Date('2026-09-15T15:00:00.000Z');
    const record = commitment({ dueAt: '2026-09-14T18:00:00.000Z' });
    const before = deriveCommitmentFact(record, today);
    const after = deriveCommitmentFact(record, tomorrow);
    assert.equal(before?.key, 'commitment:due-today:c-1');
    assert.equal(after?.key, 'commitment:elapsed:c-1');
    assert.equal(after?.issueId, before?.issueId);
    assert.match(after?.label ?? '', /^Venció: /);
    assert.deepEqual(disappearedAgingKeys(before ? [before] : [], after ? [after] : []), [
      'commitment:due-today:c-1',
    ]);
  });
});

describe('supplemental rows do not restate stored attention', () => {
  it('keeps quote facts and omits work elapsed and already-shown due today', () => {
    const asOf = new Date('2026-09-14T15:00:00.000Z');
    const facts = deriveAgingFacts({
      work: [
        {
          workItemId: 'work-1',
          title: 'Confirmar entrega',
          status: 'open',
          dueAt: '2026-09-14T18:00:00.000Z',
        },
        {
          workItemId: 'work-2',
          title: 'Trabajo vencido',
          status: 'open',
          dueAt: '2026-09-14T10:00:00.000Z',
        },
      ],
      quotes: [quote({ submittedAt: '2026-09-11T16:00:00.000Z' })],
      commitments: { list: () => [commitment({ commitmentId: 'c-9', dueAt: '2026-09-13T15:00:00.000Z' })] },
      asOf,
    });
    const groups = supplementalAgingGroups(facts, [sampleAttention]);
    assert.deepEqual(
      groups.map((group) => group.id),
      ['elapsed_due', 'quote_submitted'],
    );
    assert.equal(groups[0]?.title, 'Tiempo transcurrido');
    assert.equal(groups[0]?.facts[0]?.key, 'commitment:elapsed:c-9');
    assert.equal(groups[1]?.title, 'Cotizaciones enviadas');
    assert.equal(
      groups.some((group) => group.facts.some((fact) => fact.key.startsWith('work:'))),
      false,
    );
  });

  it('orders facts by kind, then stored instant, then key', () => {
    const facts = deriveAgingFacts({
      quotes: [
        quote({ quoteId: 'quote-b', submittedAt: '2026-09-12T16:00:00.000Z' }),
        quote({ quoteId: 'quote-a', submittedAt: '2026-09-10T16:00:00.000Z' }),
      ],
      approvals: [approval({ approvalRequestId: 'appr-9' })],
      asOf: NOON,
    });
    assert.deepEqual(
      facts.map((fact) => fact.key),
      ['approval:approver:appr-9', 'quote:submitted:quote-a', 'quote:submitted:quote-b'],
    );
  });
});

describe('aging sources stay factual', () => {
  it('does not invent a policy, a notice, or a stored overdue type', () => {
    const dir = join(process.cwd(), 'lib/work/aging');
    const sources = readdirSync(dir)
      .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
      .map((name) => readFileSync(join(dir, name), 'utf8'))
      .join('\n');
    assert.doesNotMatch(sources, FORBIDDEN_POLICY);
    assert.doesNotMatch(sources, /attentionType\s*:/);
    assert.doesNotMatch(sources, /work:overdue:/);
    assert.equal(approvalAttention.attentionType, 'pending_approval');
  });
});
