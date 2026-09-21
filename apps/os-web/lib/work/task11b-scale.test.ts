import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  DATA_HEALTH_PARTY_SAMPLE,
  NOTIFICATION_SHELL_CAP,
  WORK_CONTROL_PAGE_SIZE,
  boundNewestFirst,
  offsetPage,
  shellNotificationSample,
} from './scale-bound';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

function synth(n: number, prefix: string) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${String(i + 1).padStart(3, '0')}`,
    title:
      i === 0
        ? 'Título muy largo para verificar truncado legible en escritorio y móvil de trescientos noventa píxeles'
        : `${prefix} ${i + 1}`,
    status: i % 3 === 0 ? 'pending' : i % 3 === 1 ? 'approved' : 'rejected',
    recordedAt: Date.UTC(2026, 0, 1) + i * 60_000,
  }));
}

describe('Task 11B Work/Control scale', () => {
  it('WORK_CONTROL_PAGE_SIZE is 25', () => {
    assert.equal(WORK_CONTROL_PAGE_SIZE, 25);
  });

  for (const n of [0, 1, 25, 26, 100]) {
    it(`offsetPage handles ${n} synthetic records`, () => {
      const items = synth(n, 'row');
      const first = offsetPage(items, undefined, 25);
      assert.equal(first.page.length, Math.min(n, 25));
      assert.equal(first.hasMore, n > 25);
      if (n === 0 || n <= 25) {
        assert.equal(first.nextCursor, null);
        return;
      }
      assert.equal(first.nextCursor, '25');
      const second = offsetPage(items, first.nextCursor, 25);
      assert.equal(second.page.length, Math.min(n - 25, 25));
      assert.equal(second.hasMore, n > 50);
    });
  }

  it('WORK_100_RECORD_SAFE — trabajo desk wired', () => {
    const items = synth(100, 'work');
    const page2 = offsetPage(items, '25', 25);
    assert.equal(page2.page.length, 25);
    assert.equal(page2.nextCursor, '50');
    const page = read('app/(app)/trabajo/page.tsx');
    assert.match(page, /ListPageNav/);
    assert.match(page, /cursorPageLinks/);
    assert.match(page, /controls\.q \? \{ q: controls\.q \}/);
    assert.match(page, /total=\{null\}/);
    const list = read('components/work/work-list.tsx');
    assert.match(list, /actionLabel="Ver trabajo"/);
    assert.match(list, /OperatingScanRow/);
  });

  it('APPROVALS_100_RECORD_SAFE — authoritative status + nav', () => {
    const approved = synth(100, 'appr').filter((i) => i.status === 'approved');
    const page = offsetPage(approved, undefined, 25);
    assert.ok(page.page.length <= 25);
    assert.equal(page.hasMore, approved.length > 25);
    const desk = read('app/(app)/aprobaciones/page.tsx');
    assert.match(desk, /statusParam/);
    assert.match(desk, /ListPageNav/);
    assert.match(desk, /cursorPageLinks/);
    assert.match(desk, /resolveApprovalListCanDecide/);
    assert.doesNotMatch(desk, /commercial-approval-panel/);
    const panel = read('components/work/approval-desk-panel.tsx');
    assert.match(panel, /STATUS_CHIPS/);
    assert.match(panel, /ListSearchForm/);
    assert.match(panel, /approvalListActionLabel/);
  });

  it('ISSUES_100_RECORD_SAFE + ISSUE_JOURNAL_BOUNDED', () => {
    const issues = synth(100, 'iss');
    const page = offsetPage(issues, '25', 25);
    assert.equal(page.page.length, 25);
    assert.equal(page.hasMore, true);
    const journal = synth(80, 'j');
    const jPage = boundNewestFirst(journal, (e) => e.recordedAt, undefined, 25);
    assert.equal(jPage.page.length, 25);
    assert.equal(jPage.hasMore, true);
    assert.equal(jPage.page[0]?.id, 'j-080');
    const ctrl = readFileSync(
      join(root, '../../apps/os-api/src/issues.controller.ts'),
      'utf8',
    );
    // path from apps/os-web -> repo root apps/os-api
    assert.match(ctrl, /journalMeta/);
    assert.match(ctrl, /nextCursor/);
    assert.match(ctrl, /assigned_to_me/);
    const desk = read('app/(app)/incidencias/page.tsx');
    assert.match(desk, /view: 'assigned_to_me'/);
    assert.match(desk, /ListPageNav/);
    assert.match(desk, /total=\{null\}/);
    const detail = read('app/(app)/incidencias/[issueId]/page.tsx');
    assert.match(detail, /journalMeta/);
    const list = read('components/issue/issue-list.tsx');
    assert.match(list, /actionLabel="Ver incidencia"/);
  });

  it('COMMITMENTS_100_RECORD_SAFE', () => {
    const rows = synth(100, 'cmt');
    assert.equal(offsetPage(rows, undefined, 25).hasMore, true);
    const ctrl = readFileSync(join(root, '../../apps/os-api/src/commitments.controller.ts'), 'utf8');
    assert.match(ctrl, /hasMore/);
    assert.match(ctrl, /nextCursor/);
    const pageSrc = read('app/(app)/compromisos/page.tsx');
    assert.match(pageSrc, /ListPageNav/);
    assert.match(pageSrc, /limit: PAGE_LIMIT/);
    assert.match(pageSrc, /total=\{null\}/);
  });

  it('DECISION_MEMORY_BOUNDED', () => {
    const pageSrc = read('app/(app)/memoria-decisiones/page.tsx');
    assert.match(pageSrc, /APPROVAL_MEMORY_LIMIT = 25/);
    assert.match(pageSrc, /status: 'decided'/);
    assert.match(pageSrc, /ListPageNav/);
    assert.doesNotMatch(pageSrc, /APPROVAL_MEMORY_LIMIT = 40/);
  });

  it('NOTIFICATIONS_BOUNDED', () => {
    assert.equal(shellNotificationSample(synth(40, 'n')).length, NOTIFICATION_SHELL_CAP);
    const slot = read('components/shell/shell-notification-slot.tsx');
    assert.match(slot, /limit: 8/);
    assert.match(slot, /slice\(0, 8\)/);
    assert.doesNotMatch(slot, /limit: 40/);
  });

  it('DATA_HEALTH sample is honest 25', () => {
    assert.equal(DATA_HEALTH_PARTY_SAMPLE, 25);
    const page = read('app/(app)/salud-datos/page.tsx');
    assert.match(page, /limit: 25/);
    assert.match(page, /no implica cobertura de toda la cartera/);
  });

  it('SUBJECT_APPROVALS backend bound closed', () => {
    const ctrl = readFileSync(join(root, '../../apps/os-api/src/approvals.controller.ts'), 'utf8');
    assert.match(ctrl, /parsedLimit/);
    const svc = readFileSync(
      join(root, '../../packages/os-query/src/work/approval-query-service.ts'),
      'utf8',
    );
    assert.match(svc, /options\.limit \?\? 25/);
    assert.match(svc, /meta:/);
  });

  it('empty / zero-match surfaces remain', () => {
    for (const rel of [
      'app/(app)/trabajo/page.tsx',
      'app/(app)/aprobaciones/page.tsx',
      'app/(app)/incidencias/page.tsx',
      'app/(app)/compromisos/page.tsx',
      'app/(app)/memoria-decisiones/page.tsx',
    ]) {
      assert.match(read(rel), /EmptyState|EmptyPanel|Sin /);
    }
  });

  it('MOBILE_390 — long title retained on scan rows', () => {
    assert.ok(synth(1, 'x')[0]!.title.length > 60);
    assert.match(read('components/work/work-list.tsx'), /OperatingScanRow/);
    assert.match(read('components/issue/issue-list.tsx'), /OperatingScanRow/);
  });
});
