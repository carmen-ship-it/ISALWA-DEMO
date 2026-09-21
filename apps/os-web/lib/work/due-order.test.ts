import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type { AttentionItemReadModel, WorkSummaryReadModel } from '@isalwa/os-contracts';
import {
  formatWorkDueLine,
  sortAttentionByDue,
  sortOpenWorkByDue,
} from '@/lib/work/due-order';
import {
  approvalAttention,
  overdueAttention,
  overdueWork,
  reassignedAttention,
  sampleAttention,
  sampleWork,
} from '@/lib/work/fixtures';
import { attentionStoredDueLabel } from '@/lib/work/labels';
import { groupInicioAttention, INICIO_ATTENTION_GROUP_ORDER } from '@/lib/work/inicio-attention';

const AS_OF = new Date('2026-09-13T15:00:00.000Z');

const FORBIDDEN_RULE =
  /due soon|dueSoon|stale opportunity|seven[- ]day|quote aging|agingDays|\bSLA\b|priority score|24 hours|48 hours/i;

function readAppFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function work(overrides: Partial<WorkSummaryReadModel> & Pick<WorkSummaryReadModel, 'workItemId'>): WorkSummaryReadModel {
  return {
    ...sampleWork,
    title: overrides.workItemId,
    dueAt: null,
    status: 'open',
    ...overrides,
  };
}

describe('CC-3 open work due order', () => {
  it('places overdue before future due', () => {
    const future = work({ workItemId: 'work-future', dueAt: '2026-12-01T10:00:00.000Z', title: 'AAA' });
    const overdue = work({ workItemId: 'work-overdue', dueAt: '2026-01-01T10:00:00.000Z', title: 'ZZZ' });
    const ordered = sortOpenWorkByDue([future, overdue], AS_OF);
    assert.deepEqual(
      ordered.map((item) => item.workItemId),
      ['work-overdue', 'work-future'],
    );
  });

  it('places a nearer future due before a later future due', () => {
    const later = work({ workItemId: 'work-later', dueAt: '2026-12-20T10:00:00.000Z', title: 'AAA' });
    const sooner = work({ workItemId: 'work-sooner', dueAt: '2026-09-20T10:00:00.000Z', title: 'ZZZ' });
    const ordered = sortOpenWorkByDue([later, sooner], AS_OF);
    assert.deepEqual(
      ordered.map((item) => item.workItemId),
      ['work-sooner', 'work-later'],
    );
  });

  it('places items without dueAt after dated items', () => {
    const undated = work({ workItemId: 'work-none', dueAt: null, title: 'AAA' });
    const dated = work({ workItemId: 'work-dated', dueAt: '2026-11-01T10:00:00.000Z', title: 'ZZZ' });
    const ordered = sortOpenWorkByDue([undated, dated], AS_OF);
    assert.deepEqual(
      ordered.map((item) => item.workItemId),
      ['work-dated', 'work-none'],
    );
  });

  it('uses workItemId when dueAt is equal or missing', () => {
    const sameDueB = work({ workItemId: 'work-b', dueAt: '2026-10-01T10:00:00.000Z', title: 'AAA' });
    const sameDueA = work({ workItemId: 'work-a', dueAt: '2026-10-01T10:00:00.000Z', title: 'ZZZ' });
    const missingB = work({ workItemId: 'work-z', dueAt: null, title: 'AAA' });
    const missingA = work({ workItemId: 'work-m', dueAt: null, title: 'ZZZ' });
    const ordered = sortOpenWorkByDue([sameDueB, missingB, sameDueA, missingA], AS_OF);
    assert.deepEqual(
      ordered.map((item) => item.workItemId),
      ['work-a', 'work-b', 'work-m', 'work-z'],
    );
  });

  it('does not promote completed work that has a past due date', () => {
    const completed = work({
      workItemId: 'work-done',
      status: 'completed',
      dueAt: '2020-01-01T10:00:00.000Z',
      title: 'AAA',
    });
    const openFuture = work({
      workItemId: 'work-open-future',
      dueAt: '2026-12-01T10:00:00.000Z',
      title: 'ZZZ',
    });
    const openUndated = work({ workItemId: 'work-open-none', dueAt: null, title: 'MMM' });
    const ordered = sortOpenWorkByDue([completed, openUndated, openFuture], AS_OF);
    assert.deepEqual(
      ordered.map((item) => item.workItemId),
      ['work-open-future', 'work-open-none', 'work-done'],
    );
    assert.equal(formatWorkDueLine(completed, { asOf: AS_OF }).overdue, false);
    assert.equal(formatWorkDueLine(completed, { asOf: AS_OF }).text.startsWith('Vencido'), false);
  });

  it('keeps every item and does not filter by tenant or owner', () => {
    const otherOrg = work({
      workItemId: 'work-other-org',
      organizationId: 'org-other',
      ownerMemberId: 'mem-other',
      dueAt: '2026-01-02T10:00:00.000Z',
    });
    const ordered = sortOpenWorkByDue([sampleWork, overdueWork, otherOrg], AS_OF);
    assert.equal(ordered.length, 3);
    assert.ok(ordered.some((item) => item.organizationId === 'org-other'));
    assert.ok(ordered.some((item) => item.ownerMemberId === 'mem-other'));
  });
});

describe('CC-3 due facts in Spanish', () => {
  it('labels open work due later today as Vence hoy without calling it overdue', () => {
    const today = work({
      workItemId: 'work-today',
      dueAt: '2026-09-14T18:00:00.000Z',
    });
    const line = formatWorkDueLine(today, { asOf: new Date('2026-09-14T15:00:00.000Z') });
    assert.equal(line.text, 'Vence hoy');
    assert.equal(line.overdue, false);

    const exact = formatWorkDueLine(
      work({ workItemId: 'work-exact', dueAt: '2026-09-14T15:00:00.000Z' }),
      { asOf: new Date('2026-09-14T15:00:00.000Z') },
    );
    assert.equal(exact.text, 'Vence hoy');
    assert.equal(exact.overdue, false);

    const completed = formatWorkDueLine(
      work({
        workItemId: 'work-done-today',
        status: 'completed',
        dueAt: '2026-09-14T18:00:00.000Z',
      }),
      { asOf: new Date('2026-09-14T15:00:00.000Z') },
    );
    assert.notEqual(completed.text, 'Vence hoy');
    assert.equal(completed.overdue, false);
  });

  it('adds elapsed time to an already-overdue line without a new state word', () => {
    const line = formatWorkDueLine(overdueWork, { asOf: AS_OF });
    assert.match(line.text, /^Vencido · /);
    assert.match(line.text, / \d+ d$/);
    assert.equal(line.overdue, true);
    assert.doesNotMatch(line.text, /SLA|vence en|pronto/i);
  });

  it('shows Vencido, Fecha / vence, and Sin fecha without implementation words', () => {
    const overdue = formatWorkDueLine(overdueWork, { asOf: AS_OF });
    const future = formatWorkDueLine(sampleWork, { asOf: new Date('2026-08-24T12:00:00.000Z'), caption: 'Fecha' });
    const undated = formatWorkDueLine(work({ workItemId: 'work-none', dueAt: null }), { asOf: AS_OF });

    assert.equal(overdue.overdue, true);
    assert.match(overdue.text, /^Vencido · /);
    assert.match(future.text, /^Fecha: /);
    assert.equal(undated.text, 'Sin fecha');
    assert.doesNotMatch([overdue.text, future.text, undated.text].join('\n'), /dueAt|WorkItem|SLA|score/i);
    assert.doesNotMatch(overdue.text, /pronto|vence en/i);
  });
});

describe('CC-3 attention grouping stays intact', () => {
  it('keeps CC-1 group order and does not reclassify a past due date', () => {
    const openWithPastDue: AttentionItemReadModel = {
      ...sampleAttention,
      reasonDetail: {
        ...sampleAttention.reasonDetail,
        dueAt: '2020-01-01T00:00:00.000Z',
      },
    };
    const groups = groupInicioAttention([
      openWithPastDue,
      approvalAttention,
      reassignedAttention,
      overdueAttention,
    ]);
    assert.deepEqual(
      groups.map((group) => group.id),
      ['overdue_work', 'reassigned_work', 'pending_approval', 'open_work_assigned'],
    );
    assert.equal(groups.at(-1)?.items[0]?.attentionType, 'open_work_assigned');
    assert.match(attentionStoredDueLabel(openWithPastDue) ?? '', /^Vence: /);
    assert.doesNotMatch(attentionStoredDueLabel(openWithPastDue) ?? '', /^Vencido/);
    assert.deepEqual([...INICIO_ATTENTION_GROUP_ORDER], [
      'overdue_work',
      'reassigned_work',
      'pending_approval',
      'open_work_assigned',
    ]);
  });

  it('orders a work group by stored dueAt without changing its type', () => {
    const later: AttentionItemReadModel = {
      ...overdueAttention,
      attentionKey: 'work:overdue:later',
      reasonDetail: { ...overdueAttention.reasonDetail, dueAt: '2026-06-01T00:00:00.000Z' },
    };
    const sooner: AttentionItemReadModel = {
      ...overdueAttention,
      attentionKey: 'work:overdue:sooner',
      reasonDetail: { ...overdueAttention.reasonDetail, dueAt: '2026-01-01T00:00:00.000Z' },
    };
    const missing: AttentionItemReadModel = {
      ...overdueAttention,
      attentionKey: 'work:overdue:missing',
      reasonDetail: { source: 'work_read_model', workItemId: 'work-missing' },
    };
    const ordered = sortAttentionByDue([missing, later, sooner]);
    assert.deepEqual(
      ordered.map((item) => item.attentionKey),
      ['work:overdue:sooner', 'work:overdue:later', 'work:overdue:missing'],
    );
    const groups = groupInicioAttention([missing, later, sooner, sampleAttention]);
    assert.deepEqual(
      groups.map((group) => group.id),
      ['overdue_work', 'open_work_assigned'],
    );
    assert.deepEqual(
      groups[0]?.items.map((item) => item.attentionKey),
      ['work:overdue:sooner', 'work:overdue:later', 'work:overdue:missing'],
    );
  });
});

describe('CC-3 surfaces stay scoped', () => {
  it('sorts Trabajo in the app and does not change the work query or ownership', () => {
    const page = readAppFile('app/(app)/trabajo/page.tsx');
    const order = readAppFile('lib/work/due-order.ts');
    const grouping = readAppFile('lib/work/inicio-attention.ts');
    const controls = readAppFile('lib/productivity/list-controls.ts');

    assert.match(page, /listWorkItems\(\{[\s\S]*status:\s*'open'/);
    assert.match(page, /presentWorkPage\(/);
    assert.match(controls, /sortOpenWorkByDue\(next,/);
    // Evaluation View As may narrow with ownerMemberId; reassignment stays off Trabajo.
    assert.match(page, /ownerMemberId:\s*evaluation\.subjectMemberId/);
    assert.doesNotMatch(page, /orderBy|sortBy|ReassignWork|name="ownerMemberId"/);
    assert.doesNotMatch(page, /reassignWorkAction|Trabajo activo/);

    assert.match(order, /isWorkOverdue/);
    assert.doesNotMatch(order, /due soon|dueSoon|agingDays|priorityScore/);
    assert.doesNotMatch(grouping, FORBIDDEN_RULE);
    assert.doesNotMatch(grouping, /dueAt\s*</);
    assert.doesNotMatch(page, FORBIDDEN_RULE);

    // ReassignWork belongs on people.admin member detail, not Trabajo.
    const adminMember = readAppFile('app/(app)/administracion/equipo/[memberId]/page.tsx');
    assert.match(adminMember, /ReassignWorkPanel/);
    assert.match(adminMember, /ownerMemberId:\s*memberId/);
  });
});
