import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildIssueContext } from './types';
import {
  formatIssueStatus,
  formatReferenceType,
  formatJournalType,
  formatRelationType,
  statusToneForIssue,
  ISSUE_COPY,
} from './labels';
import { issueHref, issueListHref, reportIssueHref } from './navigation';
import {
  reportIssueContextFromOrder,
  reportIssueContextFromParty,
} from './report-context';

describe('issue status formatting', () => {
  it('formats all status values in Spanish', () => {
    assert.equal(formatIssueStatus('reported'), 'Reportado');
    assert.equal(formatIssueStatus('triaged'), 'Clasificado');
    assert.equal(formatIssueStatus('in_progress'), 'En progreso');
    assert.equal(formatIssueStatus('resolved'), 'Resuelto');
    assert.equal(formatIssueStatus('closed'), 'Cerrado');
    assert.equal(formatIssueStatus('reopened'), 'Reabierto');
    assert.equal(formatIssueStatus('open'), 'Abierta');
  });

  it('returns appropriate pill tones for each status', () => {
    assert.equal(statusToneForIssue('reported'), 'warning');
    assert.equal(statusToneForIssue('triaged'), 'info');
    assert.equal(statusToneForIssue('in_progress'), 'in_progress');
    assert.equal(statusToneForIssue('resolved'), 'success');
    assert.equal(statusToneForIssue('closed'), 'neutral');
    assert.equal(statusToneForIssue('reopened'), 'warning');
  });
});

describe('issue reference type formatting', () => {
  it('formats all reference types in Spanish', () => {
    assert.equal(formatReferenceType('party'), 'Cliente');
    assert.equal(formatReferenceType('commercial_account'), 'Cuenta comercial');
    assert.equal(formatReferenceType('opportunity'), 'Oportunidad');
    assert.equal(formatReferenceType('quote'), 'Cotización');
    assert.equal(formatReferenceType('order'), 'Pedido');
    assert.equal(formatReferenceType('product'), 'Producto');
    assert.equal(formatReferenceType('delivery'), 'Entrega');
    assert.equal(formatReferenceType('work_item'), 'Trabajo');
    assert.equal(formatReferenceType('approval_request'), 'Aprobación');
    assert.equal(formatReferenceType('commitment'), 'Compromiso');
  });
});

describe('issue journal type formatting', () => {
  it('formats all journal types in Spanish', () => {
    assert.equal(formatJournalType('observation'), 'Observación');
    assert.equal(formatJournalType('attempt'), 'Intento');
    assert.equal(formatJournalType('evidence_reference'), 'Referencia a evidencia');
    assert.equal(formatJournalType('possible_cause'), 'Causa posible');
  });
});

describe('issue relation type formatting', () => {
  it('formats all relation types in Spanish', () => {
    assert.equal(formatRelationType('related'), 'Relacionado');
    assert.equal(formatRelationType('previous_occurrence'), 'Ocurrencia anterior');
    assert.equal(formatRelationType('recurrence_of'), 'Recurrencia de');
  });
});

describe('issue navigation', () => {
  it('generates correct issue href', () => {
    assert.equal(issueHref('iss_123'), '/incidencias/iss_123');
    assert.equal(issueHref('iss 456'), '/incidencias/iss%20456');
  });

  it('generates correct issue list href with views', () => {
    assert.equal(issueListHref(), '/incidencias');
    assert.equal(issueListHref('open'), '/incidencias');
    assert.equal(issueListHref('assigned'), '/incidencias?view=assigned');
    assert.equal(issueListHref('reported'), '/incidencias?view=reported');
    assert.equal(issueListHref('resolved'), '/incidencias?view=resolved');
  });

  it('generates report issue href with context', () => {
    assert.equal(reportIssueHref(), '/incidencias/reportar');
    assert.equal(reportIssueHref({}), '/incidencias/reportar');
    assert.match(
      reportIssueHref({ referenceType: 'party', referenceId: 'pty_1' }),
      /issueRefType=party/,
    );
    assert.match(
      reportIssueHref({ referenceType: 'party', referenceId: 'pty_1' }),
      /issueRefId=pty_1/,
    );
    assert.match(
      reportIssueHref({ referenceType: 'party', referenceId: 'pty_1', referenceLabel: 'Casa Demo' }),
      /issueRefLabel=Casa[+%20]Demo/,
    );
  });
});

describe('issue context parsing', () => {
  it('parses valid context from search params', () => {
    const params = new URLSearchParams();
    params.set('issueRefType', 'party');
    params.set('issueRefId', 'pty_123');
    params.set('issueRefLabel', 'Casa Demo');

    const context = buildIssueContext(params);
    assert.deepEqual(context, {
      referenceType: 'party',
      referenceId: 'pty_123',
      referenceLabel: 'Casa Demo',
    });
  });

  it('returns null for missing required fields', () => {
    assert.equal(buildIssueContext(new URLSearchParams()), null);
    assert.equal(buildIssueContext({ issueRefType: 'party' }), null);
    assert.equal(buildIssueContext({ issueRefId: 'pty_123' }), null);
  });

  it('rejects invalid reference types', () => {
    const params = { issueRefType: 'invalid_type', issueRefId: 'pty_123' };
    assert.equal(buildIssueContext(params), null);
  });

  it('accepts all valid reference types', () => {
    const validTypes = [
      'party',
      'commercial_account',
      'opportunity',
      'quote',
      'order',
      'product',
      'delivery',
      'work_item',
      'approval_request',
      'commitment',
    ];
    for (const type of validTypes) {
      const context = buildIssueContext({ issueRefType: type, issueRefId: 'ref_123' });
      assert.ok(context, `Expected context for type ${type}`);
      assert.equal(context?.referenceType, type);
    }
  });
});

describe('issue context helpers', () => {
  it('builds Cliente and Pedido contexts without asking for opaque IDs', () => {
    assert.deepEqual(reportIssueContextFromParty('pty_1', 'Casa Demo'), {
      referenceType: 'party',
      referenceId: 'pty_1',
      referenceLabel: 'Casa Demo',
    });
    assert.deepEqual(reportIssueContextFromOrder('ord_1', 'O-000001', 'pty_1'), {
      referenceType: 'order',
      referenceId: 'ord_1',
      referenceLabel: 'O-000001',
      partyId: 'pty_1',
    });
  });
});

describe('issue copy constants', () => {
  it('provides Spanish copy for all UI strings', () => {
    assert.equal(ISSUE_COPY.reportTitle, 'Reportar incidencia');
    assert.equal(ISSUE_COPY.reportAction, 'Reportar incidencia');
    assert.equal(ISSUE_COPY.listTitle, 'Incidencias');
    assert.equal(ISSUE_COPY.detailKicker, 'Incidencia');
    assert.equal(ISSUE_COPY.owner, 'Quién es responsable');
    assert.equal(ISSUE_COPY.noOwner, 'Aún no hay una persona responsable asignada.');
    assert.equal(ISSUE_COPY.assignOwner, 'Asignar');
    assert.ok(ISSUE_COPY.cliente360Empty.includes('Todavía no hay'));
    assert.ok(ISSUE_COPY.sessionExpired.includes('sesión venció'));
  });
});
