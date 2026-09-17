import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { countDeliveriesToday } from './count-deliveries-today';

describe('countDeliveriesToday', () => {
  it('counts only deliveries on the local calendar day', () => {
    const now = new Date('2026-09-16T20:00:00.000Z');
    const count = countDeliveriesToday(
      [
        '2026-09-16T08:00:00.000Z',
        '2026-09-15T23:59:00.000Z',
        '2026-09-16T22:00:00.000Z',
      ],
      now,
    );
    assert.equal(count, 2);
  });
});
