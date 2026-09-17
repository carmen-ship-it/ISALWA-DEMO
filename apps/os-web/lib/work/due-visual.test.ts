import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import { sampleWork } from '@/lib/work/fixtures';
import { workDueRailClass, workDueVisualTone } from './due-visual';

const AS_OF = new Date('2026-09-16T15:00:00.000Z');

function work(
  overrides: Partial<WorkSummaryReadModel> & Pick<WorkSummaryReadModel, 'workItemId'>,
): WorkSummaryReadModel {
  return {
    ...sampleWork,
    title: overrides.workItemId,
    dueAt: null,
    status: 'open',
    ...overrides,
  };
}

describe('workDueVisualTone', () => {
  it('uses soft red for overdue open work and amber for soon', () => {
    assert.equal(
      workDueVisualTone(work({ workItemId: 'overdue', dueAt: '2026-09-01T10:00:00.000Z' }), AS_OF),
      'overdue',
    );
    assert.equal(
      workDueVisualTone(work({ workItemId: 'soon', dueAt: '2026-09-17T10:00:00.000Z' }), AS_OF),
      'soon',
    );
    assert.equal(
      workDueVisualTone(
        work({ workItemId: 'done', status: 'completed', dueAt: '2026-09-01T10:00:00.000Z' }),
        AS_OF,
      ),
      'done',
    );
    assert.equal(
      workDueVisualTone(work({ workItemId: 'neutral', dueAt: '2026-12-01T10:00:00.000Z' }), AS_OF),
      'neutral',
    );
  });

  it('maps tones to left-rail classes without inventing priority scores', () => {
    assert.match(String(workDueRailClass('overdue')), /danger/);
    assert.match(String(workDueRailClass('soon')), /warning/);
    assert.match(String(workDueRailClass('done')), /success/);
    assert.equal(workDueRailClass('neutral'), undefined);
  });
});
