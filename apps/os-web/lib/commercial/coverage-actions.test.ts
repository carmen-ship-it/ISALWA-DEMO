import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { grantableCoverageActionsFor } from '@isalwa/os-contracts';
import { coverageActionChoices, formatCoverageActions, parseCoverageActions } from '@/lib/commercial/coverage-actions';

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
