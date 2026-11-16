import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { summaryCardsFromCounts } from './build-summary-cards';
import { MI_DIA_EMPTY } from './mi-dia';

const counts = { needsAttention: 0, forToday: 0, approvals: 0, openIssues: 0 };

describe('Hoy: a failed load is never a zero metric', () => {
  it('a real zero stays a zero; a failed source is null per card', () => {
    const ok = summaryCardsFromCounts(counts as never, {});
    assert.deepEqual(ok.map((c) => c.count), [0, 0, 0, 0]);
    const partial = summaryCardsFromCounts(counts as never, { approvals: true, issues: true });
    assert.deepEqual(partial.map((c) => c.count), [0, 0, null, null]);
  });

  it('the legacy boolean still marks only issues unavailable', () => {
    assert.deepEqual(summaryCardsFromCounts(counts as never, true).map((c) => c.count), [0, 0, 0, null]);
  });

  it('empty and failure copy are distinct and exact', async () => {
    const { t } = await import('@/lib/i18n/es');
    assert.equal(MI_DIA_EMPTY, 'No tienes pendientes en esta sección');
    assert.equal(t('pages.inicio.attentionUnavailable'), 'No pudimos cargar estos datos.');
    assert.equal(t('pages.inicio.retry'), 'Reintentar');
    assert.notEqual(MI_DIA_EMPTY, t('pages.inicio.attentionUnavailable'));
  });
});
