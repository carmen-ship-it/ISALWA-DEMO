import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { grantableCoverageActionsFor } from '@isalwa/os-contracts';
import {
  coverageActionChoices,
  coverageWindowFromForm,
  formatCoverageActions,
  parseCoverageActions,
} from '@/lib/commercial/coverage-actions';

describe('T03 coverage action choice ("Apoyo temporal")', () => {
  it('offers only what the server says the viewer may grant; default is commercial work only', () => {
    assert.deepEqual(coverageActionChoices(undefined).map((c) => c.action), ['commercial.work']);
    assert.deepEqual(coverageActionChoices([]).map((c) => c.action), ['commercial.work']);
    assert.deepEqual(
      coverageActionChoices(['commercial.work', 'customer.edit', 'quote.convert']).map((c) => c.action),
      ['commercial.work', 'customer.edit', 'quote.convert'],
    );
    assert.deepEqual(coverageActionChoices(['customer.archive', 'commercial.work']).map((c) => c.action), ['commercial.work']);
  });

  it('grantor rule: edit needs commercial.customer.edit, conversion needs commercial.order.convert', () => {
    assert.deepEqual(grantableCoverageActionsFor([]), ['commercial.work']);
    assert.deepEqual(grantableCoverageActionsFor(['commercial.customer.edit']), ['commercial.work', 'customer.edit']);
    assert.deepEqual(grantableCoverageActionsFor(['commercial.order.convert']), ['commercial.work', 'quote.convert']);
    assert.deepEqual(grantableCoverageActionsFor(['commercial.quote.convert.own']), ['commercial.work'], 'own conversion is not delegable');
  });

  it('parses form values without defaulting upward and labels stored actions', () => {
    assert.deepEqual(parseCoverageActions([]), []);
    assert.deepEqual(parseCoverageActions(['quote.convert', 'quote.convert', 'customer.archive', 'x']), ['quote.convert']);
    assert.equal(formatCoverageActions(undefined), 'Continuar oportunidades y cotizaciones');
    assert.equal(
      formatCoverageActions(['commercial.work', 'quote.convert']),
      'Continuar oportunidades y cotizaciones · Convertir cotizaciones enviadas a pedido',
    );
  });
});

describe('T03 coverage window from the form (30-day engineering default)', () => {
  // 2026-10-18 10:00 in La Paz.
  const now = new Date('2026-10-18T14:00:00.000Z');
  it('requires an end day and ends at the La Paz midnight after it', () => {
    assert.equal(coverageWindowFromForm({}, now).ok, false);
    assert.deepEqual(coverageWindowFromForm({ endsOn: '2026-10-25' }, now), { ok: true, endsAt: '2026-10-26T04:00:00.000Z' });
    assert.deepEqual(coverageWindowFromForm({ startsOn: '2026-10-18', endsOn: '2026-10-25' }, now), {
      ok: true,
      endsAt: '2026-10-26T04:00:00.000Z',
    });
  });
  it('sends a future start and refuses windows the server would refuse', () => {
    assert.deepEqual(coverageWindowFromForm({ startsOn: '2026-11-01', endsOn: '2026-11-10' }, now), {
      ok: true,
      startsAt: '2026-11-01T04:00:00.000Z',
      endsAt: '2026-11-11T04:00:00.000Z',
    });
    assert.equal(coverageWindowFromForm({ endsOn: '2026-11-16' }, now).ok, true);
    assert.equal(coverageWindowFromForm({ endsOn: '2026-11-17' }, now).ok, false);
    assert.equal(coverageWindowFromForm({ endsOn: '2026-10-17' }, now).ok, false);
    assert.equal(coverageWindowFromForm({ endsOn: '2026-02-30' }, now).ok, false);
  });
});
