import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { humanizeBusinessEventType } from './humanize';
import { formatBoliviaDateTime } from './format-bolivia-datetime';

describe('people-admin Inicio activity line', () => {
  it('shows a known work.created event in Spanish with the Bolivian clock', () => {
    const eventType = 'work.created';
    const occurredAt = '2026-11-25T02:58:00.000Z';
    const entityLabel = 'Trabajo · 01M88A74…';
    const subject = humanizeBusinessEventType(eventType);
    const line = [entityLabel, formatBoliviaDateTime(occurredAt)].join(' · ');
    assert.equal(subject, 'Trabajo creado');
    assert.equal(line, 'Trabajo · 01M88A74… · 24/11/2026, 22:58');
    assert.equal(subject.includes('Work'), false);
    assert.equal(line.includes('p. m.'), false);
  });
});