import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { overdueWork, sampleWork } from '@/lib/work/fixtures';
import {
  clearListControls,
  countActiveListControls,
  presentWorkPage,
  readListControls,
} from './list-controls';

const AS_OF = new Date('2026-08-24T12:00:00.000Z');

describe('list controls', () => {
  it('defaults to due sort and compact density', () => {
    const controls = readListControls({});
    assert.equal(controls.sort, 'due');
    assert.equal(controls.density, 'compact');
    assert.equal(controls.focus, undefined);
    assert.equal(countActiveListControls(controls), 0);
  });

  it('counts clearable presentation controls without counting view tabs', () => {
    const controls = readListControls({
      q: 'seguimiento',
      sort: 'priority',
      density: 'comfortable',
      focus: 'approval',
      view: 'overdue',
    });
    assert.equal(countActiveListControls(controls), 4);
    const cleared = clearListControls({
      q: 'seguimiento',
      sort: 'priority',
      density: 'comfortable',
      focus: 'approval',
      view: 'overdue',
      subjectType: 'party',
      subjectId: 'party-1',
      cursor: 'abc',
    });
    assert.equal(cleared.q, undefined);
    assert.equal(cleared.sort, undefined);
    assert.equal(cleared.focus, undefined);
    assert.equal(cleared.cursor, undefined);
    assert.equal(cleared.view, 'overdue');
    assert.equal(cleared.subjectId, 'party-1');
  });

  it('keeps due order by default on the loaded page', () => {
    const later = { ...sampleWork, workItemId: 'w-later', dueAt: '2026-08-26T15:00:00.000Z' };
    const ordered = presentWorkPage([later, overdueWork, sampleWork], readListControls({}), AS_OF);
    assert.deepEqual(
      ordered.map((item) => item.workItemId),
      ['work-2', 'work-1', 'w-later'],
    );
  });

  it('orders by priority and focuses approval without inventing rows', () => {
    const low = { ...sampleWork, workItemId: 'w-low', priority: 'low', approvalStatus: 'none' as const };
    const urgent = {
      ...sampleWork,
      workItemId: 'w-urgent',
      priority: 'urgent',
      approvalStatus: 'pending' as const,
    };
    const high = {
      ...sampleWork,
      workItemId: 'w-high',
      priority: 'high',
      approvalStatus: 'pending' as const,
    };
    const focused = presentWorkPage(
      [low, urgent, high],
      readListControls({ focus: 'approval', sort: 'priority' }),
      AS_OF,
    );
    assert.deepEqual(
      focused.map((item) => item.workItemId),
      ['w-urgent', 'w-high'],
    );
  });
});
