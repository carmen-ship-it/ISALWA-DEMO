import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  humanizeAuditAction,
  humanizeBusinessEventType,
  humanizeResourceType,
} from './humanize';

describe('audit humanize mapping', () => {
  it('maps known business event types to Spanish labels', () => {
    assert.equal(humanizeBusinessEventType('party.created'), 'Cliente creado');
    assert.equal(humanizeBusinessEventType('approval.approved'), 'Aprobación concedida');
    assert.equal(humanizeBusinessEventType('member.suspended'), 'Acceso suspendido');
  });

  it('falls back to title case for unknown event types', () => {
    assert.equal(humanizeBusinessEventType('custom.event'), 'Custom Event');
  });

  it('maps resource types for audit rows', () => {
    assert.equal(humanizeResourceType('party'), 'Cliente');
    assert.equal(humanizeResourceType('approval_request'), 'Aprobación');
  });

  it('maps audit actions without exposing raw keys as primary', () => {
    assert.equal(humanizeAuditAction('party.updated'), 'Cliente actualizado');
    assert.equal(humanizeAuditAction('member.role.changed'), 'Rol asignado');
  });
});
