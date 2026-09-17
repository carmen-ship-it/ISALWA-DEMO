import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { auditActionOptions, auditResourceTypeOptions } from './filter-options';

describe('audit filter options', () => {
  it('humanizes resource type labels', () => {
    const party = auditResourceTypeOptions().find((o) => o.value === 'party');
    assert.ok(party);
    assert.equal(party.label, 'Cliente');
  });

  it('humanizes action filter labels', () => {
    const updated = auditActionOptions().find((o) => o.value === 'party.updated');
    assert.ok(updated);
    assert.equal(updated.label, 'Cliente actualizado');
  });
});
