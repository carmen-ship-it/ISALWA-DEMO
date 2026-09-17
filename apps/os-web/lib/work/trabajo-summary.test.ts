import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import { sampleWork } from '@/lib/work/fixtures';
import { summarizeTrabajoOpen } from './trabajo-summary';

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

describe('summarizeTrabajoOpen', () => {
  it('buckets open work into Para hoy / Vencido / Próximo / Sin fecha from stored dueAt', () => {
    const summary = summarizeTrabajoOpen(
      [
        work({ workItemId: 'overdue', dueAt: '2026-09-10T10:00:00.000Z' }),
        work({ workItemId: 'today', dueAt: '2026-09-16T20:00:00.000Z' }),
        work({ workItemId: 'soon', dueAt: '2026-09-20T10:00:00.000Z' }),
        work({ workItemId: 'none', dueAt: null }),
        work({ workItemId: 'done', status: 'completed', dueAt: '2026-09-10T10:00:00.000Z' }),
      ],
      AS_OF,
    );

    assert.deepEqual(summary, {
      paraHoy: 1,
      vencido: 1,
      proximo: 1,
      sinFecha: 1,
    });
  });
});
