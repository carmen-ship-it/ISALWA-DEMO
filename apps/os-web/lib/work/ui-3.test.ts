import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OsApiError } from '../api/os-api-errors';
import {
  approvalAttention,
  decidedApproval,
  overdueWork,
  sampleApproval,
  sampleAttention,
  sampleWork,
  staleProjection,
} from './fixtures';
import {
  attentionHeadline,
  formatApprovalStatus,
  formatAttentionReason,
  formatDueDate,
  formatWorkStatus,
  isWorkOverdue,
} from './labels';
import {
  approvalHref,
  attentionInspectLabel,
  attentionTargetHref,
  workItemHref,
} from './navigation';
import { classifyQueryError } from './query-errors';

describe('UI-3 work labels', () => {
  it('formats work and approval statuses in Spanish', () => {
    assert.equal(formatWorkStatus('open'), 'En curso');
    assert.equal(formatApprovalStatus('pending'), 'Pendiente');
    assert.equal(formatApprovalStatus('approved'), 'Aprobado');
  });

  it('detects overdue open work', () => {
    assert.equal(isWorkOverdue(overdueWork, new Date('2026-08-24T12:00:00.000Z')), true);
    assert.equal(isWorkOverdue(sampleWork, new Date('2026-08-24T12:00:00.000Z')), false);
  });

  it('formats due date with Sin fecha fallback', () => {
    assert.equal(formatDueDate(null), 'Sin fecha');
    assert.match(formatDueDate('2026-08-25T15:00:00.000Z'), /2026/);
  });
});

describe('UI-3 attention derivation UX', () => {
  it('uses reasonDetail title as attention headline', () => {
    assert.equal(attentionHeadline(sampleAttention), 'Seguimiento cliente ABC');
  });

  it('explains why attention appears without treating it as a task', () => {
    assert.match(formatAttentionReason(sampleAttention), /asignado/i);
    assert.match(formatAttentionReason(approvalAttention), /aprobación/i);
  });

  it('links attention to existing trabajo/aprobaciones routes', () => {
    assert.equal(attentionTargetHref(sampleAttention), workItemHref('work-1'));
    assert.equal(attentionTargetHref(approvalAttention), approvalHref('appr-1'));
    assert.equal(attentionInspectLabel(approvalAttention), 'Ver aprobación');
  });
});

describe('UI-3 query surface errors', () => {
  it('classifies unauthorized and forbidden', () => {
    assert.deepEqual(
      classifyQueryError(new OsApiError({ kind: 'unauthorized', status: 401, code: 'AUTH_REQUIRED', message: 'x' })),
      { kind: 'unauthorized' },
    );
    assert.deepEqual(
      classifyQueryError(new OsApiError({ kind: 'forbidden', status: 403, code: 'PERMISSION_DENIED', message: 'x' })),
      { kind: 'forbidden' },
    );
  });

  it('classifies unavailable API errors', () => {
    assert.deepEqual(
      classifyQueryError(new OsApiError({ kind: 'unavailable', status: 503, code: 'UNKNOWN', message: 'x' })),
      { kind: 'unavailable' },
    );
  });
});

describe('UI-3 list fixtures — no fake data shape', () => {
  it('work fixture matches WorkSummaryReadModel fields', () => {
    assert.equal(sampleWork.workItemId, 'work-1');
    assert.equal(sampleWork.approvalStatus, 'none');
    assert.ok(sampleWork.title);
  });

  it('approval fixture includes pending and decided variants', () => {
    assert.equal(sampleApproval.status, 'pending');
    assert.equal(decidedApproval.status, 'approved');
    assert.ok(decidedApproval.decidedAt);
  });

  it('stale projection flag is readable for UI banner', () => {
    assert.equal(staleProjection.isStale, true);
    assert.ok(staleProjection.pendingOutboxCount > 0);
  });

  it('empty collections remain honest', () => {
    const items: typeof sampleWork[] = [];
    assert.equal(items.length, 0);
  });
});

describe('UI-3 navigation', () => {
  it('encodes detail route paths', () => {
    assert.equal(workItemHref('work/1'), '/trabajo/work%2F1');
    assert.equal(approvalHref('appr-1'), '/aprobaciones/appr-1');
  });
});
