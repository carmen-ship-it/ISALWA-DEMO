import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertNoContextSnapshot,
  assertNoRawPayload,
  HISTORIAL_SCOPE_COPY,
  sortTimelineChronologicalDesc,
  timelineEntrySummary,
  timelineEventLabel,
} from '@/lib/commercial/timeline-labels';
import {
  sampleApprovalApprovedTimelineEntry,
  sampleApprovalRejectedTimelineEntry,
  sampleApprovalRequestedTimelineEntry,
  sampleCommercialTimelineEntry,
  samplePartyTimelineEntry,
  sampleWorkCancelledTimelineEntry,
  sampleWorkCompletedTimelineEntry,
  sampleWorkCreatedTimelineEntry,
  sampleWorkReassignedTimelineEntry,
} from '@/lib/commercial/fixtures';

describe('UI-4B work timeline labels', () => {
  it('labels work.created', () => {
    assert.equal(timelineEventLabel('work.created'), 'Trabajo creado');
    assert.match(timelineEntrySummary(sampleWorkCreatedTimelineEntry), /Seguimiento cotización/);
  });

  it('labels task.reassigned', () => {
    assert.equal(timelineEventLabel('task.reassigned'), 'Trabajo reasignado');
  });

  it('labels work.completed', () => {
    assert.equal(timelineEventLabel('work.completed'), 'Trabajo completado');
  });

  it('labels work.cancelled with factual reason only', () => {
    assert.equal(timelineEventLabel('work.cancelled'), 'Trabajo cancelado');
    assert.match(timelineEntrySummary(sampleWorkCancelledTimelineEntry), /Cliente pospuso/);
  });

  it('does not expose work internal IDs or subject metadata', () => {
    const summary = timelineEntrySummary(sampleWorkCreatedTimelineEntry);
    assert.doesNotMatch(summary, /work-1/);
    assert.doesNotMatch(summary, /subjectType/);
    assert.doesNotMatch(summary, /party-1/);
  });
});

describe('UI-4B approval timeline labels', () => {
  it('labels approval.requested', () => {
    assert.equal(timelineEventLabel('approval.requested'), 'Aprobación solicitada');
  });

  it('labels approval.approved', () => {
    assert.equal(timelineEventLabel('approval.approved'), 'Aprobación aprobada');
  });

  it('labels approval.rejected with bounded reason', () => {
    assert.equal(timelineEventLabel('approval.rejected'), 'Aprobación rechazada');
    assert.match(timelineEntrySummary(sampleApprovalRejectedTimelineEntry), /Falta documentación/);
  });

  it('does not expose approval internal IDs or subject registry terms', () => {
    for (const entry of [
      sampleApprovalRequestedTimelineEntry,
      sampleApprovalApprovedTimelineEntry,
      sampleApprovalRejectedTimelineEntry,
    ]) {
      const summary = timelineEntrySummary(entry);
      assert.doesNotMatch(summary, /appr-/);
      assert.doesNotMatch(summary, /subjectType/);
      assert.doesNotMatch(summary, /work_item/);
    }
  });
});

describe('UI-4B timeline safety', () => {
  it('does not render raw payload', () => {
    assert.equal(assertNoRawPayload(sampleWorkCreatedTimelineEntry), true);
    assert.equal(assertNoRawPayload({ ...sampleWorkCreatedTimelineEntry, payload: {} }), false);
  });

  it('does not render contextSnapshot', () => {
    assert.equal(assertNoContextSnapshot(sampleApprovalApprovedTimelineEntry), true);
    assert.equal(
      assertNoContextSnapshot({ facts: { contextSnapshot: { secret: true } } }),
      false,
    );
  });

  it('falls back safely for unknown event types', () => {
    assert.equal(timelineEventLabel('future.unknown.event'), 'Actividad registrada');
  });
});

describe('UI-4B mixed chronology', () => {
  it('preserves newest-first ordering contract', () => {
    const sorted = sortTimelineChronologicalDesc([
      samplePartyTimelineEntry,
      sampleCommercialTimelineEntry,
      sampleWorkCreatedTimelineEntry,
      sampleApprovalRejectedTimelineEntry,
    ]);
    assert.equal(sorted[0].eventType, 'approval.rejected');
    assert.equal(sorted.at(-1)?.eventType, 'opportunity.created');
  });

  it('includes party and commercial regression labels', () => {
    assert.equal(timelineEventLabel('party.created'), 'Cliente registrado');
    assert.equal(timelineEventLabel('quote.submitted'), 'Cotización presentada');
    assert.equal(
      timelineEventLabel('quote.send_recorded', { channel: 'whatsapp' }),
      'Cotización registrada como enviada por WhatsApp',
    );
  });
});

describe('UI-4B historial scope copy', () => {
  it('documents expanded timeline domains', () => {
    assert.match(HISTORIAL_SCOPE_COPY, /trabajo/i);
    assert.match(HISTORIAL_SCOPE_COPY, /aprobaciones/i);
    assert.doesNotMatch(HISTORIAL_SCOPE_COPY, /No incluye trabajo/i);
    assert.doesNotMatch(HISTORIAL_SCOPE_COPY, /historial completo/i);
  });
});

describe('UI-4B work completion without invented urgency', () => {
  it('completed work summary does not infer overdue or performance', () => {
    const summary = timelineEntrySummary(sampleWorkCompletedTimelineEntry);
    assert.doesNotMatch(summary, /vencid/i);
    assert.doesNotMatch(summary, /urgente/i);
  });

  it('reassigned work does not expose member IDs', () => {
    const summary = timelineEntrySummary(sampleWorkReassignedTimelineEntry);
    assert.doesNotMatch(summary, /member-/);
  });
});
