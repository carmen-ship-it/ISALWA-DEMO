import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAY_NEED_CONFIRMATION_COPY,
  formatAbsoluteUpdate,
  formatFreshnessDisplay,
} from './display';

describe('formatFreshnessDisplay', () => {
  const asOf = new Date('2026-09-17T15:00:00');

  it('returns null for missing or invalid timestamps', () => {
    assert.equal(formatFreshnessDisplay(null, { asOf }), null);
    assert.equal(formatFreshnessDisplay('not-a-date', { asOf }), null);
  });

  it('uses relative labels under 24h and absolute beyond', () => {
    assert.equal(
      formatFreshnessDisplay(new Date(asOf.getTime() - 30_000).toISOString(), { asOf })?.label,
      'Actualizado ahora',
    );
    assert.equal(
      formatFreshnessDisplay(new Date(asOf.getTime() - 25 * 60_000).toISOString(), { asOf })?.label,
      'Actualizado hace 25 min',
    );
    assert.equal(
      formatFreshnessDisplay(new Date(asOf.getTime() - 3 * 60 * 60_000).toISOString(), { asOf })
        ?.label,
      'Actualizado hace 3 h',
    );
    const older = formatFreshnessDisplay('2026-09-10T10:32:00', { asOf });
    assert.ok(older);
    assert.match(older.label, /Última actualización:/);
    assert.doesNotMatch(older.label, /desactualizado|stale|%|ingreso/i);
  });

  it('flags mayNeedConfirmation only when caller asserts it', () => {
    const flagged = formatFreshnessDisplay(asOf.toISOString(), {
      asOf,
      mayNeedConfirmation: true,
    });
    assert.equal(flagged?.mayNeedConfirmation, true);
    assert.equal(MAY_NEED_CONFIRMATION_COPY, 'Puede requerir confirmación');
    assert.match(formatAbsoluteUpdate(new Date('2026-09-14T10:32:00'), asOf), /14 Sep · 10:32/);
  });
});
