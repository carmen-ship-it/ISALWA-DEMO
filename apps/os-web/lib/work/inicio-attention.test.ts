import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type { AttentionItemReadModel } from '@isalwa/os-contracts';
import { t } from '@/lib/i18n/es';
import {
  approvalAttention,
  overdueAttention,
  reassignedAttention,
  sampleAttention,
} from '@/lib/work/fixtures';
import { attentionDueLabel, formatAttentionType } from '@/lib/work/labels';
import {
  groupInicioAttention,
  INICIO_ATTENTION_GROUP_ORDER,
  inicioAttentionEmptyCtas,
  inicioAttentionEmptyMessage,
} from '@/lib/work/inicio-attention';

const FORBIDDEN_AGING =
  /due soon|dueSoon|stale opportunity|seven[- ]day|quote aging|agingDays|\bSLA\b|MetricCard|StatGroup/i;

function readAppFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('CC-1 inicio attention grouping', () => {
  it('places overdue before open work, then reassigned and pending approval', () => {
    const groups = groupInicioAttention([
      sampleAttention,
      approvalAttention,
      reassignedAttention,
      overdueAttention,
    ]);

    assert.deepEqual(
      groups.map((group) => group.id),
      ['overdue_work', 'reassigned_work', 'pending_approval', 'open_work_assigned'],
    );
    assert.deepEqual(
      groups.map((group) => group.title),
      [
        'Vencidos',
        'Reasignados a mí',
        'Aprobaciones pendientes para mí',
        'Otros pendientes abiertos',
      ],
    );
    assert.ok(
      groups.findIndex((group) => group.id === 'overdue_work') <
        groups.findIndex((group) => group.id === 'open_work_assigned'),
    );
  });

  it('groups reassigned items without a numeric rank', () => {
    const groups = groupInicioAttention([reassignedAttention, sampleAttention]);
    const reassigned = groups.find((group) => group.id === 'reassigned_work');
    assert.ok(reassigned);
    assert.equal(reassigned.items.length, 1);
    assert.equal(reassigned.items[0]?.attentionKey, reassignedAttention.attentionKey);
    assert.equal('score' in reassigned, false);
    assert.equal('rank' in reassigned, false);
  });

  it('groups pending approvals for the current member payload', () => {
    const groups = groupInicioAttention([approvalAttention]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.id, 'pending_approval');
    assert.equal(groups[0]?.title, 'Aprobaciones pendientes para mí');
    assert.equal(groups[0]?.items[0]?.reasonCode, 'approval.pending.for_you');
  });

  it('keeps equal due dates in the same group, ordered by attention key', () => {
    const later = { ...overdueAttention, attentionKey: 'work:overdue:later' };
    const earlier = { ...overdueAttention, attentionKey: 'work:overdue:earlier' };
    const groups = groupInicioAttention([later, earlier]);
    assert.equal(groups[0]?.id, 'overdue_work');
    assert.deepEqual(
      groups[0]?.items.map((item) => item.attentionKey),
      ['work:overdue:earlier', 'work:overdue:later'],
    );
  });

  it('does not reclassify open work as overdue from a past due date', () => {
    const openWithPastDue: AttentionItemReadModel = {
      ...sampleAttention,
      reasonDetail: {
        ...sampleAttention.reasonDetail,
        dueAt: '2020-01-01T00:00:00.000Z',
      },
    };
    const groups = groupInicioAttention([openWithPastDue]);
    assert.equal(groups[0]?.id, 'open_work_assigned');
    assert.equal(attentionDueLabel(openWithPastDue), null);
    const overdueLabel = attentionDueLabel(overdueAttention);
    assert.match(overdueLabel ?? '', /^Venció: /);
    assert.match(overdueLabel ?? '', /2026/);
    assert.doesNotMatch(overdueLabel ?? '', /pronto|vence en/i);
  });

  it('uses employee wording and omits a score', () => {
    assert.deepEqual([...INICIO_ATTENTION_GROUP_ORDER], [
      'overdue_work',
      'reassigned_work',
      'pending_approval',
      'open_work_assigned',
    ]);
    assert.equal(formatAttentionType('overdue_work'), 'Vencido');
    assert.equal(formatAttentionType('reassigned_work'), 'Reasignado a usted');
    assert.equal(formatAttentionType('pending_approval'), 'Aprobación pendiente');
    assert.equal(formatAttentionType('open_work_assigned'), 'Trabajo pendiente');
  });
});

describe('CC-1 empty attention state', () => {
  it('does not invent a celebration or KPI when nothing needs attention', () => {
    assert.equal(groupInicioAttention([]).length, 0);
    assert.equal(
      inicioAttentionEmptyMessage(),
      'No tiene pendientes que requieran atención ahora.',
    );
    assert.deepEqual(inicioAttentionEmptyCtas(), [
      { href: '/trabajo', label: 'Ver trabajo' },
      { href: '/clientes', label: 'Ir a clientes' },
    ]);
    assert.equal(t('pages.inicio.attention'), 'Necesita su atención');
    assert.doesNotMatch(inicioAttentionEmptyMessage(), /felicidades|todo al día|kpi/i);
  });
});

describe('CC-1 inicio page wiring', () => {
  it('calls listAttention and keeps commercial lists secondary', () => {
    const page = readAppFile('app/(app)/inicio/page.tsx');
    const panel = readAppFile('components/work/inicio-attention-panel.tsx');
    const grouping = readAppFile('lib/work/inicio-attention.ts');

    assert.match(page, /listAttention\(\{\s*activeOnly:\s*true/);
    assert.doesNotMatch(page, /listAttention\([\s\S]*memberId/);
    assert.doesNotMatch(page, /admin|team feed|role mapping/i);

    const attentionAt = page.indexOf('InicioAttentionPanel');
    const opportunitiesAt = page.indexOf('pages.inicio.opportunities');
    const draftAt = page.indexOf('pages.inicio.quotesDraft');
    const submittedAt = page.indexOf('pages.inicio.quotesSubmitted');
    assert.ok(attentionAt >= 0);
    assert.ok(attentionAt < opportunitiesAt);
    assert.ok(opportunitiesAt < draftAt);
    assert.ok(draftAt < submittedAt);
    assert.match(page, /OpportunityOrgList/);
    assert.match(page, /QuoteOrgList/);

    const gridOpen = page.lastIndexOf('<div', page.indexOf('lg:grid-cols-2'));
    const leadershipAt = page.indexOf('<InicioLeadershipSection');
    assert.ok(gridOpen >= 0);
    assert.ok(leadershipAt > gridOpen);
    let depth = 0;
    for (const tag of page.slice(gridOpen, leadershipAt).matchAll(/<\/?div\b[^>]*>/g)) {
      depth += tag[0].startsWith('</') ? -1 : 1;
    }
    assert.equal(depth, 0);

    assert.doesNotMatch(page, FORBIDDEN_AGING);
    assert.doesNotMatch(panel, FORBIDDEN_AGING);
    assert.doesNotMatch(grouping, FORBIDDEN_AGING);
    assert.doesNotMatch(grouping, /dueAt\s*</);

    const employeeCopy = [
      t('pages.inicio.attention'),
      t('pages.inicio.attentionEmpty'),
      t('pages.inicio.attentionOverdue'),
      t('pages.inicio.attentionReassigned'),
      t('pages.inicio.attentionApprovals'),
      t('pages.inicio.attentionOpen'),
      t('pages.inicio.description'),
    ].join('\n');
    assert.doesNotMatch(employeeCopy, /AttentionItem|WorkItem|projection|\bevent\b|\bscope\b/i);
  });
});
